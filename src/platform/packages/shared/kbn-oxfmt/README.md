# @kbn/oxfmt

Dev-only helpers for running the repo's oxfmt formatter (`.oxfmtrc.json`) from tooling such as
code generators and `node scripts/oxfmt`.

This lives in its own package rather than `@kbn/dev-utils` because `@kbn/dev-utils` is reachable
from server-side code: importing `oxfmt` there would pull the formatter into the distributable's
`package.json` dependencies.
