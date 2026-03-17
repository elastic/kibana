---
navigation_title: "Amazon S3"
applies_to:
  stack: preview 9.4
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

AWS Region
:   The AWS Region to authenticate to.


## Test connectors [amazon-s3-action-configuration]

You can test connectors as you're creating or editing the connector in {{kib}}. The test verifies connectivity by trying to access a list of available buckets for your authenticated account.

The Amazon S3 connector has the following actions:

List buckets
:   List the available buckets your authenticated account has access to
    - **region** (optional) overrides the region to list the buckets for
    - **prefix** (optional) filter bucket names by the given prefix

List bucket objects
:   List the objects in a given bucket
    - **bucket** (required) the bucket name to list the objects for
    - **region** (optional) overrides the connector's configured AWS Region to list the objects for the specified bucket. If omitted, the connector's configured region is used.
    - **prefix** (optional) filter the bucket objects by the given prefix
    - **maxKeys** (optional) the maximum number of keys per page, defaults to 1000, limit of 1000. If there are more objects, a continuation token will be provided to retrieve the next page of results
    - **continuationToken** (optional) the token used to retrieve the next page of results.

Download file
:   Downloads a given object from a bucket
    - **bucket** (required) the bucket to download the object from
    - **key** (required) the key of the object to download
    - **maximumDownloadSizeBytes** (optional) the size in bytes that the connector is allowed to download the content for. Default of 128 KB. If the file to download exceeds this amount, a link to the object in the AWS S3 Bucket will be returned instead of the content.


## Get API credentials [amazon-s3-api-credentials]

To use the Amazon S3 connector, you need an AWS Access Key ID, Secret Access Key, and Region for the account. Follow these steps to create or view your credentials:

1. Sign in to the [AWS Management Console](https://console.aws.amazon.com/).
2. Click on your account name in the top right corner and select **Security Credentials** from the dropdown menu.

:::{note}
If you do not see the **Security Credentials** link, reach out to your AWS administrator to get access.
:::
   
3. For better security, AWS recommends using IAM (Identity and Access Management) users instead of root account credentials. If prompted, click **Get Started with IAM Users** to access the IAM Dashboard.
4. In the IAM Dashboard, select **Users** from the left navigation menu.
5. Click on an existing IAM user or create a new user with programmatic access.
6. Navigate to the **Security credentials** tab for the selected user.
7. Under **Access keys**, you can view existing access keys (the Access Key ID is visible, but the Secret Access Key is only shown when first created).
8. To create a new access key, click **Create access key** and choose the appropriate use case (for example, **Application running outside AWS**). Download the `.csv` file or copy both the **Access Key ID** and **Secret Access Key** immediately. The secret key is only shown once and cannot be retrieved later.
9.  For the **AWS Region**, select the region where your S3 buckets are located (for example, `us-east-1`, `eu-west-1`). You can find the region in the AWS console URL or in the S3 bucket details.

:::{tip}
Make sure that the IAM user has the necessary S3 permissions (for example, `s3:ListBucket`, `s3:GetObject`) on the buckets you want the credentials to access for the connector to function properly.
:::
