---
applies_to:
  stack: preview 9.2
  serverless: unavailable
---

# Case analytics indices schema[case-analytics-indices-schema]

This page lists fields that can appear in case analytics indices documents. These fields display general data about cases, in addition to data about case comments, attachments, and activity. 

To learn more about the indices and cases as data feature, refer to [Use cases as data](docs-content://explore-analyze/alerts-cases/cases/cases-as-data.md).

::::{important}
The cases as data feature is in technical preview, meaning the schema for the case analytics indices is subject to change. 
::::

## General case data 

| Name | Field type | Description |
| :---- | :---- | :---- |
| @timestamp | date | The date the document for the case was added to the case analytics indices.
| title | text / semantic\_text | The case title. |
| description | text / semantic\_text | The case description. |
| tags | keyword | Tags added to case. |
| category | keyword | The case category. |
| status | keyword | The case status. Possible values are `open`, `in-progress`, `closed`. |
| status\_sort | long | The status of the case. Possible values are `0`, `10`, `20`, where `0` corresponds to the `open` status, `10` corresponds to the `in-progress` status, and `20` corresponds to the `closed` status.|
| severity | keyword | The case severity. Possible values are `low`, `medium`, `high`, `critical`. |
| severity\_sort | long | The severity of the case. Possible values are `0`, `10`, `20`, `30`, where `0` corresponds to the `low` severity, `10` corresponds to the `medium` severity, `20` corresponds to the `high` severity, and `30` corresponds to the `critical` severity.|
| created\_at | date | The date of when the case was created, provided in ISO 8601 \[2\] format and set to the servers' timezone.  |
| created\_at\_ms | long | The case creation timestamp in milliseconds. |
| created\_by.username | keyword | The username of the user who created the case. |
| created\_by.profile\_uid | keyword | The user ID of the user who created the case. |
| created\_by.full\_name | keyword | The full name of the user who created the case. |
| created\_by.email | keyword | The email address of the user who created the case. |
| updated\_at | date | The date of when case was last modified, provided in ISO 8601 \[2\] and set to the servers' timezone. |
| updated\_at\_ms | long | The case update timestamp in milliseconds. |
| updated\_by.username | keyword | The username of the user who last updated the case. |
| updated\_by.profile\_uid | keyword | The user ID of the user who last updated the case. |
| updated\_by.full\_name | keyword | The full name of the user who last updated the case. |
| updated\_by.email | keyword | The email address of the user who last updated the case. |
| closed\_at | date | The date of case closure, provided in ISO 8601 \[2\] format and set to the servers' timezone. |
| closed\_at\_ms | long | The case closure timestamp in milliseconds. |
| closed\_by.username | keyword | The username of the user who closed the case. |
| closed\_by.profile\_uid | keyword | The user ID of the user who closed the case. |
| closed\_by.full\_name | keyword | The full name of the user who closed the case. |
| closed\_by.email | keyword | The email address of the user who closed the case. |
| assignees | keyword | The user IDs of the users assigned to the case. |
| time\_to\_resolve | long | The time in seconds taken to mark the case as **Closed**. It is calculated by measuring how long it took to update the case status from **Open** to **Closed**. |
| time\_to\_acknowledge | long | The time in seconds taken to mark the case as in progress. It is calculated by measuring how long it took to update the case status to **In progress** after the case was created. |
| time\_to\_investigate | long | The time in seconds taken to mark the case as **Closed**. It is calculated by measuring how long it took to update the case status from **In progress** to **Closed**.  |
| custom\_fields.type | keyword | The custom field type. |
| custom\_fields.label | keyword | The custom field label. |
| custom\_fields.value | keyword | The value of the custom field value. |
| observables.type | keyword | The observable type. |
| observables.label | keyword | The observable label. |
| observables.value | keyword | The observable value. |
| total\_comments | integer | The total number of comments in a case. |
| total\_alerts | integer | The total number of alerts attached to a case. |
| total\_assignees | integer | The total number of assignees to a case. |
| owner | keyword | The case owner. |
| space\_ids | keyword | A list of spaces where the case is visible. |

## Case comments 

| Name | Field type | Description |
| :---- | :---- | :---- |
| @timestamp | date | The date the document for the case was added to the case analytics indices. |
| case\_id | keyword | The case UUID.  |
| comment | text | The user’s comment. |
| created\_at | date | The date the comment was added, provided in ISO 8601 \[2\] format and set to the servers' timezone. |
| created\_by.username | keyword | The username of the user who created the case. |
| created\_by.profile\_uid | keyword | The user ID of the user who created the case. |
| created\_by.full\_name | keyword | The full name of the user who created the case. |
| created\_by.email | keyword | The email address of the user who created the case. |
| updated\_at | date | The date of the last case update, provided in ISO 8601 \[2\] format and set to the servers' timezone. |
| updated\_by.username | keyword | The username of the user who last updated the case. |
| updated\_by.profile\_uid | keyword | The user ID of the user who last updated the case. |
| updated\_by.full\_name | keyword | The full name of the user who last updated the case. |
| updated\_by.email | keyword | The email address of the user who last updated the case. |
| owner | keyword | The case owner. |
| space\_ids | keyword | The list of spaces the case is visible. |

## Case attachments

| Name | Field type | Description |
| :---- | :---- | :---- |
| @timestamp | date | The date the document for the case was added to the case analytics indices. |
| case\_id | keyword | The case UUID. |
| type | keyword | The type of attachment. |
| payload | flattened | The data in the attachment. |
| payload.alerts.id | keyword | The ID of the alert. |
| payload.alerts.index | keyword | The index that stores the alert document.  |
| payload.file.id | keyword | The file ID. |
| payload.file.extension | keyword | The file extension. |
| payload.file.mimeType | keyword | The file mime type. |
| payload.file.name | keyword | The file name. |
| created\_at | date | The date of when the case was created, provided in ISO 8601 \[2\] format and set to the servers' timezone. |
| created\_by.username | keyword | The username of the user who created the case. |
| created\_by.profile\_uid | keyword | The user ID of the user who created the case. |
| created\_by.full\_name | keyword | The full name of the user who created the case. |
| created\_by.email | keyword | The email address of the user who created the case. |
| owner | keyword | The case owner. |
| space\_ids | keyword | The list of spaces the case is visible. |

## Case activity 

| Name | Field type | Description |
| :---- | :---- | :---- |
| @timestamp | date | The date the document for the case was added to the case analytics indices. |
| case\_id | keyword | The case UUID. |
| action | keyword | The user’s action. Possible values are `add`, `create`, `update`, `delete`.  |
| type | keyword | The type of the action a user took. Possible values are `status`, `create_case`, `delete_case`. |
| payload.status | keyword | The new case status. Possible values are `open`, `in-progress`, `closed`. |
| payload.tags | keyword | The new case tags. |
| payload.category | keyword | The new case category. |
| payload.severity | keyword | The new case severity. Possible values are `low`, `medium`, `high`, `critical`. |
| created\_at | date | The date of when the case was created, provided in ISO 8601 \[2\] format and set to the servers' timezone. |
| created\_at\_ms | long | The case creation timestamp in milliseconds. |
| created\_by.username | keyword | The username of the user who created the case. |
| created\_by.profile\_uid | keyword | The user ID of the user who created the case. |
| created\_by.full\_name | keyword | The full name of the user who created the case. |
| created\_by.email | keyword | The email address of the user who created the case. |
| owner | keyword | The case owner. |
| space\_ids | keyword | The list of spaces the case is visible. |