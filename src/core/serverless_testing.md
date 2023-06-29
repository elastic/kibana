# Deploying custom Kibana images on serverless deployments

## Introduction

This guide is about deploying a custom Kibana image on an MKI (QA or staging) serverless project. 

Deploying custom images can be used to test a feature in an actual environment before merging the feature to `main`.
It can be very helpful in some scenarios, for example to test model version migrations.

## Building the custom image

[[[TODO]]]

`node scripts/build --release --docker-images`

https://elastic.slack.com/archives/C5UDAFZQU/p1687939127892509

## Preparing your environment

**NOTE**: The full guide is available in [the serverless documentation](https://docs.elastic.dev/serverless/create-project)

### 1. Create an API key for your user

By following [the documentation](https://docs.elastic.dev/serverless/create-project#serverless-api-authentication).

The code snippets in this document assume that this API key is then exported under the `API_KEY` environment variable.

### 2. set variables depending on your environment

For QA:
```bash
export ENV_URL="https://global.qa.cld.elstc.co"
```

For staging:
```bash
export ENV_URL="https://global.staging.cld.elstc.co"
```

They will be used in the snippets below.

## Deploying the custom image

The custom image can be set using the `overrides` option of the project API (both for create and update).

However, this option is only accessible via the API, and not via the UI 
(which is why we prepared our environment to use the API in the previous section).

### Creating a new project with a custom image

We have to use the `create project` API for this:

```bash
curl "${ENV_URL}/api/v1/serverless/projects/{PROJECT_TYPE}" \
       -H "Authorization: ApiKey $API_KEY" \
       -H "Content-Type: application/json" 
       -XPOST -d '{
          "name": "{NAME}",
          "region_id": "aws-eu-west-1",
          "overrides": {
            "kibana": {
              "docker_image": "{CUSTOM_DOCKER_IMAGE}"
            }
          }
       }'
```

With the variable being:
- `PROJECT_TYPE` can be one of `elasticsearch`, `observability` or `security`
- `NAME` is the name you want to give to your project
- `CUSTOM_DOCKER_IMAGE` is the id of the image you built in the `Building the custom image` section

### Updating an existing project with a custom image

#### Creating the project

If the project isn't created yet, you can either do it from [the UI](https://console.qa.cld.elstc.co/projects/create), 
or using the API:

```bash
curl "${ENV_URL}/api/v1/serverless/projects/{PROJECT_TYPE}" \
       -H "Authorization: ApiKey $API_KEY" \
       -H "Content-Type: application/json" 
       -XPOST -d '{
          "name": "{NAME}",
          "region_id": "aws-eu-west-1"
       }'
```

then store the resulting projectId (`id` field of the response)

#### Preparing your cluster

If testing a migration, you may want to prepare your cluster to whatever state you want it to have before switching the image.

Depending on what you need to do, you can use the Kibana UI, the import API, or any other mean you find suitable.

If you need to connect to the project's ES cluster directly, There is [a guide to connect to a QA/Staging MKI cluster](https://docs.elastic.dev/serverless/es-troubleshooting).

#### Updating the deployment to set your custom image

We have to use the `update project` API for this:

```bash
curl "${ENV_URL}/api/v1/serverless/projects/{PROJECT_TYPE}/${PROJECT_ID}" \
       -H "Authorization: ApiKey $API_KEY" \
       -H "Content-Type: application/json"  \
       -XPUT -d '{
          "name": "{NAME}",
          "overrides": {
            "kibana": {
              "docker_image": "{CUSTOM_DOCKER_IMAGE}"
            }
          }
       }'
```

With the variable being:
- `PROJECT_TYPE` can be one of `elasticsearch`, `observability` or `security`
- `NAME` is the name you want to give to your project
- `CUSTOM_DOCKER_IMAGE` is the id of the image you built in the `Building the custom image` section

### Switching back to using the default image

This can be done by performing an `update` and omitting the `overrides` properties (or setting them to an empty object):

```bash
curl "${ENV_URL}/api/v1/serverless/projects/{PROJECT_TYPE}/${PROJECT_ID}" \
       -H "Authorization: ApiKey $API_KEY" \
       -H "Content-Type: application/json"  \
       -XPUT -d '{
          "name": "{NAME}",
       }'
```