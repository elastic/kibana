as work on serverless picks up we will add config values to these files that
define how Kibana will run in "serverless" modes. To start Kibana locally with
this configuration, pass `--serverless={mode}` or run `yarn serverless-{mode}`

valid modes are currently: `es`, `oblt`, and `security`

configuration is applied in the following order, later values override
 1. kibana.yml
 2. serverless.yml
 3. serverless.{mode}.yml
 4. kibana.dev.yml
 5. serverless.dev.yml
 6. serverless.{mode}.dev.yml
