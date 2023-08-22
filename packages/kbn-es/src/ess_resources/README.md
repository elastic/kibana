# Elasticsearch Serverless Resources
The resources in this directory are used for seeding Elasticsearch Serverless (ESS) images with users, roles and tokens for SSL and authentication. ESS requires file realm authentication, so we will bind mount them into the containers at `/usr/share/elasticsearch/config/`.

## Default User

The default superuser authentication to login to Kibana is:

```
username: kibana_serverless_superuser
password: changeme
```

## Service Account and Tokens

This section for Service Accounts was originally from the [ESS repository](https://github.com/elastic/elasticsearch-serverless/blob/main/serverless-build-tools/src/main/resources/README.service_tokens.md).

The "service_tokens" file contains this line:
```
elastic/kibana/kibana-dev:$2a$10$mY2RuGROhk56vLNh.Mgwue98BnkdQPlTR.yGh38ao5jhPJobvuBCq
```

That line defines a single service token
- For the `elastic/kibana` service account
- The token is named `kibana-dev`
- The token's secret is hashed using bcrypt (`$2a$`) using `10` rounds

Although Elasticsearch used PBKDF2_STRETCH by default, the k8s controller
creates tokens using bcrypt, so we mimic that here.

The hash is not reversible, so this README is here to tell you what the secret is.
The secret value is: `UUUUUULK-* Z4`
That produces an encoded token of: `AAEAAWVsYXN0aWMva2liYW5hL2tpYmFuYS1kZXY6VVVVVVVVTEstKiBaNA`
Yes, the secret was specially chosen to produce an encoded value that can be more easily recognised in development.

If a node is configured to use this `service_tokens` file, then you can authenticate to it with
```
curl -H "Authorization: Bearer AAEAAWVsYXN0aWMva2liYW5hL2tpYmFuYS1kZXY6VVVVVVVVTEstKiBaNA" http://localhost:9200/_security/_authenticate
```

The name of the token (`kibana-dev`) is important because the `operator_users.yml` file designates that token as an operator and allows us to seed an ESS cluster with this token.