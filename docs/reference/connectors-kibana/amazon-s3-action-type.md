---
navigation_title: "Amazon S3"
mapped_pages:
  - https://www.elastic.co/guide/en/kibana/current/amazon-s3-action-type.html
applies_to:
  stack: preview
  serverless: preview
---

# Amazon S3 connector [amazon-s3-action-type]

The Amazon S3 connector enables the listing of buckets, objects within a bucket, and downloading of a specified bucket object.

## Create connectors in {{kib}} [define-amazon-s3-ui]

You can create connectors in **{{stack-manage-app}} > {{connectors-ui}}**. 

### Connector configuration [amazon-s3-connector-configuration]

Amazon S3 connectors have the following configuration properties:

AWS Access Key ID
:   The AWS Access Key ID for the account to authenticate to S3.

AWS Secret Access Key
:   The AWS Secret Access Key for the account to authenticate to S3.

AWS region
:   The AWS region to authenticate to.



## Test connectors [amazon-s3-action-configuration]

You can test connectors as you're creating or editing the connector in {{kib}}. The test verifies connectivity by trying to access a list of available buckets for your authnticated account.

The Amazon s3 connector has the following actions:

List buckets
:   List the available buckets your authenticated account has access to
    - **region** (optional) overrides the region to list the buckets for
    - **prefix** (optional) filter bucket names by the given prefix

List bucket objects
:   List the objects in a given bucket
    - **bucket** (required) the bucket name to list the objects for
    - **prefix** (optional) filter the bucket objects by the given prefix

Download file
:   Downloads a given object from a bucket
    - **bucket** (required) the bucket to download the object from
    - **key** (required) the key of the object to download


## Get API credentials [amazon-s3-api-credentials]

To use the Amazon s3 connector, you need to:

<!-- TODO: Add instructions here -->
