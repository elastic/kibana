MAX_ITERATIONS = 20
SELF_FIX_ATTEMPTS = 1

VALIDATION_COMMANDS = [
    "node scripts/eslint.js",
    "yarn test:type_check",
]

KIBANA_BOOTSTRAP_COMMAND = "yarn kbn bootstrap"

PR_COMMIT_AUTHOR = "Ralph-Agent <ralph@bot.local>"

BRANCH_PREFIX = "ralph/"

UPSTREAM_REPO = "elastic/kibana"
UPSTREAM_DEFAULT_BRANCH = "main"
