# Cursor agent notes

Known constraints when running the build-prototype-from-design skill inside Cursor's agent mode. These do not apply to Claude Code or a normal terminal.

## Sandbox constraints

Cursor's agent runs commands in a sandboxed environment with three known limitations:

**1. Yarn cache is not writable**
The default yarn cache path causes an `EPERM` error during bootstrap. Set `YARN_CACHE_FOLDER` explicitly:
```sh
YARN_CACHE_FOLDER="$HOME/.yarn-cache-kibana" yarn kbn bootstrap --no-validate
```

**2. Bootstrap requires elevated permissions**
`yarn kbn bootstrap` invokes `moon` (Kibana's build orchestrator). The sandbox kills it with `SIGABRT` without elevated permissions. Always invoke the bootstrap shell call with `required_permissions: ["all"]`.

**3. Long-running services cannot run in the sandbox**
`yarn es snapshot` and `yarn start` are persistent processes. The sandbox kills them with `SIGABRT` within 2–3 seconds. These must be run by the user in their own terminal windows — not via the agent.

When Kibana must be started, present the commands clearly to the user and wait for confirmation before polling for readiness.

## Polling for readiness (instead of watching stdout)

Since long-running process output is not visible in agent mode, use polling:

```sh
# Elasticsearch
until curl -s -u elastic:changeme http://localhost:9200 > /dev/null; do sleep 5; done && echo "ES ready"

# Kibana
until curl -s -u elastic:changeme http://localhost:5601/api/status | grep -q '"available"'; do sleep 10; done && echo "Kibana ready"
```
