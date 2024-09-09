# Elasticsearch Serverless Resources

The resources in this directory are used for seeding Elasticsearch Serverless images with users, roles and tokens for SSL and authentication. Serverless requires file realm authentication, so we will bind mount them into the containers at `/usr/share/elasticsearch/config/`.

## Roles

Roles are defined in `roles.yml` for each project under 'es' | 'oblt' | 'security' folder respectively and intended to mock a Serverless deployment. It must be in sync with `project-controller` defined roles and used in real (MKI) environments. In case of some differences tests may pass against Serverless snapshot environment but fail against MKI environments creating confusion.

### Why `security_roles.json` is here?

`security_roles.json` is a subset of defined in `roles.yml` roles in a JSON format and extended with necessary fields
to be compatible with `/api/security/role/{roleName}` endpoint. It's consumed by test environments like Cypress to be able to run different scenarios.

## Users

### Default user

The default superuser authentication to login to Kibana is:

```
username: elastic_serverless
password: changeme
```

### Adding users

1. Add the user:encrypted_password to `users` file. The encrypted password for `elastic_serverless` is `changeme` if you want to reuse the value.
1. Set the new user's roles in `users_roles` file in the format of `role:username`
1. Add the username to `operator_users.yml` in the array for file realm users.

## Service Account and Tokens

This section for Service Accounts was originally from the [ES Serverless repository](https://github.com/elastic/elasticsearch-serverless/blob/main/serverless-build-tools/src/main/resources/README.service_tokens.md).

The "service_tokens" file contains this line:

```
elastic/kibana/kibana-dev:$2a$10$mY2RuGROhk56vLNh.Mgwue98BnkdQPlTR.yGh38ao5jhPJobvuBCq
elastic/fleet-server/fleet-server-dev:$2a$10$tgMX7U09G/EVTP8F/O4zHewhA3DXdv7iM5F2vny9TC6zw77RrutyG
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

The name of the token (`kibana-dev`) is important because the `operator_users.yml` file designates that token as an operator and allows us to seed a serverless cluster with this token.

## Overriding resources

The files found in this directory can be overwritten with customized versions by using the `--resources` option of the `yarn es serverless` command.
Assuming a customized `users` and `users_roles` are located in `/tmp/my_es/` directory and executing the below command from the root of Kibana, here is an example:

```shell
yarn es serverless --resources=/tmp/my_es/users --resources=/tmp/my_es/users_roles
```
