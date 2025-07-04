as work on serverless picks up we will add config values to these files that
define how Kibana will run in "serverless" modes. To start Kibana locally with
this configuration, pass `--serverless={mode}` or run `yarn serverless-{mode}`

[//]: # (BOOKMARK - List of Kibana project types)
valid modes are currently: `es`, `oblt`, `security` and `chat`

configuration is applied in the following order, later values override
 1. serverless.yml (serverless configs go first)
 2. serverless.{mode}.yml (serverless configs go first)
 3. serverless.{mode}.{tier}.yml (serverless specific tier configs if tier is set)
 4. base config, in this preference order:
  - my-config.yml(s) (set by --config)
  - env-config.yml (described by `env.KBN_CONFIG_PATHS`)
  - kibana.yml (default @ `env.KBN_PATH_CONF`/kibana.yml)
 5. kibana.dev.yml
 6. serverless.dev.yml
 7. serverless.{mode}.dev.yml
 8. serverless.{mode}.{tier}.dev.yml
