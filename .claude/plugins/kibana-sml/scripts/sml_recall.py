#!/usr/bin/env python3
"""
UserPromptSubmit hook: searches Kibana SML for relevant past conversations
and injects them as structured memory context before Claude processes the prompt.

The output format mirrors what the agent builder injects via its beforeAgent hook:
a clearly delimited memory block with instructions on how to use the results,
followed by the search hits with their chunk_id, title, content preview, has_more
flag, and score — identical to what the sml_search tool returns.

Auth priority:
  1. KIBANA_API_KEY env var  -> ApiKey {key}
  2. ELASTIC_PASSWORD env var -> Basic elastic:{password}
  3. fallback                 -> Basic elastic:changeme

Kibana URL: KIBANA_HOST env var (default: http://localhost:5601).
Basepath is auto-detected by following the redirect from /.
"""

import base64
import json
import os
import sys
import urllib.error
import urllib.request

# ---------------------------------------------------------------------------
# Auth
# ---------------------------------------------------------------------------

def get_auth_header() -> str:
    api_key = os.environ.get('KIBANA_API_KEY', '').strip()
    if api_key:
        return f'ApiKey {api_key}'
    password = os.environ.get('ELASTIC_PASSWORD', 'changeme').strip()
    creds = base64.b64encode(f'elastic:{password}'.encode()).decode()
    return f'Basic {creds}'


# ---------------------------------------------------------------------------
# Basepath detection
# ---------------------------------------------------------------------------

def detect_base_path(kibana_host: str) -> str:
    """
    Hit GET / without following redirects.
    Kibana dev-mode redirects to /{basepath}/app/home — extract /{basepath}.
    Returns '' when no basepath is present or detection fails.
    """
    class _NoRedirect(urllib.request.HTTPErrorProcessor):
        def http_response(self, request, response):
            return response
        https_response = http_response

    opener = urllib.request.build_opener(_NoRedirect)
    try:
        req = urllib.request.Request(f'{kibana_host}/', method='GET')
        with opener.open(req, timeout=3) as resp:
            location = resp.getheader('Location', '')
            if location and location.startswith('/'):
                parts = location.split('/')
                if len(parts) > 2 and parts[1]:
                    return f'/{parts[1]}'
    except Exception:
        pass
    return ''


# ---------------------------------------------------------------------------
# SML search
# ---------------------------------------------------------------------------

def sml_search(kibana_host: str, base_path: str, query: str) -> dict:
    url = f'{kibana_host}{base_path}/internal/agent_builder/sml/_search'
    body = json.dumps({
        'query': query[:512],
        'size': 5,
        'type': 'conversation',
        'min_score': 0.5,
        'include_prompt': True,
    }).encode()

    req = urllib.request.Request(
        url,
        data=body,
        headers={
            'Authorization': get_auth_header(),
            'Content-Type': 'application/json',
            'kbn-xsrf': 'true',
        },
        method='POST',
    )

    with urllib.request.urlopen(req, timeout=5) as resp:
        return json.loads(resp.read())


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main() -> None:
    try:
        data = json.load(sys.stdin)
    except Exception:
        sys.exit(0)

    prompt = data.get('prompt', '').strip()
    if len(prompt) < 5:
        sys.exit(0)

    kibana_host = os.environ.get('KIBANA_HOST', 'http://localhost:5601').rstrip('/')
    base_path = detect_base_path(kibana_host)

    try:
        result = sml_search(kibana_host, base_path, prompt)
    except Exception:
        # Never block the prompt if SML is unavailable
        sys.exit(0)

    memory_prompt = result.get('prompt', '').strip()
    if not memory_prompt:
        sys.exit(0)

    print(memory_prompt)
    sys.exit(0)


if __name__ == '__main__':
    main()
