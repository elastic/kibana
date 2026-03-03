---
navigation_title: "AI Assistant settings"
mapped_pages:
  - https://www.elastic.co/guide/en/kibana/current/ai-assistant-settings-kb.html
applies_to:
  deployment:
    self: all
---

# AI Assistant settings in {{kib}} [ai-assistant-settings-kb]

`xpack.productDocBase.artifactRepositoryUrl`
:   Url of the repository to use to download and install the Elastic product documentation artifacts for the AI assistants. Defaults to `https://kibana-knowledge-base-artifacts.elastic.co` Supports:
    
    * HTTP(S) URLs
    * {applies_to}`stack: ga 9.1+` Local file paths (`file://`).

## Configuring product documentation for air-gapped environments [configuring-product-doc-for-airgap]

Installing product documentation requires network access to its artifact repository. 

* {applies_to}`stack: ga 9.0+` In air-gapped environments, or environments where remote network traffic is blocked or filtered, you can use a local artifact repository by specifying the path with the `file://` URI scheme.
* {applies_to}`stack: ga 9.0+` In air-gapped environments, or environments where remote network traffic is blocked or filtered, the artifact repository must be manually deployed somewhere accessible by the Kibana deployment.

Deploying a custom product documentation repository can be done in 2 ways: using a S3 bucket, or using a CDN.

### Deploying using a S3 bucket [_deploying_using_a_s3_bucket]

**1. Download the artifacts for your current {{kib}} version**

The artifact names follow this pattern: `kb-product-doc-{{productName}}-{{versionMajor}}.{{versionMinor}}.zip`

The available products are:
- elasticsearch
- kibana
- observability
- security

You must download, from the source repository (`https://kibana-knowledge-base-artifacts.elastic.co/`), the artifacts for your current version of Kibana.

For example, for Kibana 8.16:
- `kb-product-doc-elasticsearch-8.16.zip`
- `kb-product-doc-kibana-8.16.zip`
- `kb-product-doc-observability-8.16.zip`
- `kb-product-doc-security-8.16.zip`

**2. Upload the artifacts to your local S3 bucket**

Upload the artifact files to your custom S3 bucket, then make sure that they are properly listed in the bucket’s index, similar to the bucket listing displayed when accessing `https://kibana-knowledge-base-artifacts.elastic.co/` in a browser.

**3. Configure {{kib}} to use the custom repository**

Add the following line to your {{kib}} configuration file:

```yaml
# Replace with the root of your custom bucket
xpack.productDocBase.artifactRepositoryUrl: "<MY_CUSTOM_REPOSITORY_URL>"
```

**4. Restart {{kib}}**

You should then be able to install the product documentation feature from the AI assistant management page.


### Deploying using a CDN [_deploying_using_a_cdn]

Deploying using a CDN is quite similar to the S3 bucket approach. The main difference will be that we will need to manually generate the bucket listing and set it as the CDN folder’s index page.

**1. Download the artifacts for your current {{kib}} version**

Following the step from the `Deploying using a S3 bucket` section

**2. Upload the artifacts to the CDN**

Create a folder in your CDN, and upload the artifacts to it.

**3. Create and upload the bucket listing**

Generate the S3 bucket listing xml file for the folder.

To do that, copy the following template, and replace the versions in the `<Key>` tags with your current version of {{kib}}.

For example for {{kib}} 8.17, replace all `8.16` occurrences in the file with `8.17`.

```xml
<ListBucketResult>
    <Name>kibana-ai-assistant-kb-artifacts</Name>
    <IsTruncated>false</IsTruncated>
    <Contents>
        <Key>kb-product-doc-elasticsearch-8.16.zip</Key>
    </Contents>
    <Contents>
        <Key>kb-product-doc-kibana-8.16.zip</Key>
    </Contents>
    <Contents>
        <Key>kb-product-doc-observability-8.16.zip</Key>
    </Contents>
    <Contents>
        <Key>kb-product-doc-security-8.16.zip</Key>
    </Contents>
</ListBucketResult>
```

Then upload that xml file to the same CDN folder where the artifacts were uploaded, and then configure the folder to have that file served as the folder’s index.

**4. Configure {{kib}} to use the custom repository**

Add the following line to your {{kib}} configuration file:

```yaml
# Replace with the path to the CDN folder previously configured
xpack.productDocBase.artifactRepositoryUrl: "<MY_CUSTOM_REPOSITORY_URL>"
```

**5. Restart {{kib}}**

You should then be able to install the product documentation feature from the AI assistant management page.



