# LLM decision layer: ask the connector whether two entities are the same person.

import json
import re

SYSTEM = """\
You perform entity resolution. Decide whether two account records refer to the
same real-world person, allowing that one person can appear differently across
systems while different people may share common attributes like a name. Weigh
strong identifiers (e.g. email, organization) above weak ones.
Respond with strict JSON only: {"same": true|false, "reason": "<short>"}.
"""

_FIELDS = ["user.name", "user.full_name", "user.email", "user.group.name", "host.name"]


def _describe(fields):
    parts = [f"{k}={fields[k]}" for k in _FIELDS if k in fields]
    return "{" + ", ".join(parts) + "}"


def _parse_same(raw):
    # tolerant: extract the first {...} object from the reply
    m = re.search(r"\{.*\}", raw, re.S)
    return bool(json.loads(m.group(0) if m else raw).get("same"))


def make_gate(stack, connector_id, fx, log, band=None):
    # returns accept(a,b,score)->bool; band=(low,high) only consults the LLM in [low,high)
    cache = {}
    stats = {"accepted": 0, "rejected": 0, "calls": 0, "rejectedPairs": []}

    def accept(a, b, score):
        if band is not None:
            low, high = band
            if score >= high:
                stats["accepted"] += 1
                return True
            if score < low:
                stats["rejected"] += 1
                return False
        key = tuple(sorted((a, b)))
        if key in cache:
            same = cache[key]
        else:
            messages = [
                {"role": "system", "content": SYSTEM},
                {"role": "user", "content":
                    f"Account A: {_describe(fx.fields(a))}\n"
                    f"Account B: {_describe(fx.fields(b))}\n"
                    "Are A and B the same person?"},
            ]
            stats["calls"] += 1
            try:
                raw = stack.invoke_llm(messages, connector_id=connector_id)
                same = _parse_same(raw)
            except Exception as e:
                log(f"  [llm] error on {key}, defaulting to link: {e}")
                same = True
            cache[key] = same
        if same:
            stats["accepted"] += 1
        else:
            stats["rejected"] += 1
            stats["rejectedPairs"].append([a, b])
        return same

    return accept, stats
