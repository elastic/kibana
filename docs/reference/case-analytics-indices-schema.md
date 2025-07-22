---
applies_to:
  serverless: ga
  stack: ga
---
# Case analytics indices schema[case-analytics-indices-schema]

## Cases index

The `.internal.cases` index contains general data related to cases. This index uses the `.cases` alias.

| Name | Field type | Description |
| :---- | :---- | :---- |
| @timestamp | date | The date of the insertion of the case in the CAI |
| title | text / semantic\_text | The title of the case |
| description | text / semantic\_text | The description of the case |
| tags | keyword | The tags of the case |
| category | keyword | The category of the case |
| status | keyword | The status of the case. Possible values: open, in-progress, closed. |
| status\_sort | long | The status of the case. Possible values: 0, 10, 20\. |
| severity | keyword | The severity of the case. Possible values: low, medium, high, critical. |
| severity\_sort | long | The severity of the case. Possible values: 0, 10, 20, 30\. |
| created\_at | date | The date of case creation in ISO 8601 \[2\] format |
| created\_at\_ms | long | The case creation timestamp in milliseconds |
| created\_by.username | keyword | The username of the user who created the case |
| created\_by.profile\_uid | keyword | The profile UUID of the user who created the case |
| created\_by.full\_name | keyword | The full name of the user who created the case |
| created\_by.email | keyword | The email of the user who created the case |
| updated\_at | date | The date of the last case update in ISO 8601 \[2\] format |
| updated\_at\_ms | long | The case update timestamp in milliseconds |
| updated\_by.username | keyword | The username of the user who last updated the case |
| updated\_by.profile\_uid | keyword | The profile UUID of the user who last updated the case |
| updated\_by.full\_name | keyword | The full name of the user who last updated the case |
| updated\_by.email | keyword | The email of the user who last updated the case |
| closed\_at | date | The date of case closure in ISO 8601 \[2\] format |
| closed\_at\_ms | long | The case closure timestamp in milliseconds |
| closed\_by.username | keyword | The username of the user who closed the case |
| closed\_by.profile\_uid | keyword | The profile UUID of the user who closed the case |
| closed\_by.full\_name | keyword | The full name of the user who closed the case |
| closed\_by.email | keyword | The email of the user who closed the case |
| assignees | keyword | The profile IDs of the assignees of the case |
| time\_to\_resolve | long | The time in seconds taken to close a case. It is calculated as `case.closed_at - case.created_at` |
| time\_to\_acknowledge | long | The time in seconds taken to mark the case as in progress. It is calculated as `case.in_progress_at - case.created_at` |
| time\_to\_investigate | long | The time in seconds taken to mark the case from in progress to closed. It is calculated as `case.closed_at - case.in_progress_at` |
| custom\_fields.type | keyword | The type of the custom field |
| custom\_fields.label | keyword | The label of the custom field |
| custom\_fields.value | keyword | The value of the custom field |
| observables.type | keyword | The type of the observable |
| observables.label | keyword | The label of the observable |
| observables.value | keyword | The value of the observable |
| total\_comments | integer | The total number of comments in a case |
| total\_alerts | integer | The total number of alerts in a case |
| total\_assigness | integer | The total number of assignees in a case |
| owner | keyword | The owner of the case |
| space\_ids | keyword | The list of spaces where the case is visible. |

## Cases attachments index
The `.internal.cases-attachments` index contains data related to attachments in cases (alerts and files only). This index uses the `.cases-attachments` alias.

| Name | Field type | Description |
| :---- | :---- | :---- |
| @timestamp | date | The date of the insertion of the attachment in the CAI |
| case\_id | keyword | The ID of the case |
| type | keyword | The type of attachment |
| payload | flattened | The data in the attachment |
| payload.alerts.id | keyword | The ID of the alert |
| payload.alerts.index | keyword | The index of the alert |
| payload.file.id | keyword | The ID of the file |
| payload.file.extension | keyword | The extension of the file |
| payload.file.mimeType | keyword | The mime type of the file |
| payload.file.name | keyword | The name of the file |
| created\_at | date | The date of case creation in ISO 8601 \[2\] format |
| created\_by.username | keyword | The username of the user who created the case |
| created\_by.profile\_uid | keyword | The profile UUID of the user who created the case |
| created\_by.full\_name | keyword | The full name of the user who created the case |
| created\_by.email | keyword | The email of the user who created the case |
| owner | keyword | The owner of the case |
| space\_ids | keyword | The list of spaces the case is visible. |

## Cases user comments index

The `.internal.cases-comments` index contains data related to user comments in cases. This index uses the `.cases-comments` alias.

| Name | Field type | Description |
| :---- | :---- | :---- |
| @timestamp | date | The date of the insertion of the attachment in the CAI |
| case\_id | keyword | The ID of the case |
| comment | text | The user’s comment |
| created\_at | date | The date of comment creation in ISO 8601 \[2\] format |
| created\_by.username | keyword | The username of the user who created the case |
| created\_by.profile\_uid | keyword | The profile UUID of the user who created the case |
| created\_by.full\_name | keyword | The full name of the user who created the case |
| created\_by.email | keyword | The email of the user who created the case |
| updated\_at | date | The date of the last case update in ISO 8601 \[2\] format |
| updated\_by.username | keyword | The username of the user who last updated the case |
| updated\_by.profile\_uid | keyword | The profile UUID of the user who last updated the case |
| updated\_by.full\_name | keyword | The full name of the user who last updated the case |
| updated\_by.email | keyword | The email of the user who last updated the case |
| owner | keyword | The owner of the case |
| space\_ids | keyword | The list of spaces the case is visible. |

## Cases activity index
The `.internal.cases-activity` index contains data related to user activity in cases. This index uses the `.cases-activity` alias.

| Name | Field type | Description |
| :---- | :---- | :---- |
| @timestamp | date | The date of the insertion of the attachment in the CAI |
| case\_id | keyword | The ID of the case |
| action | keyword | The user’s action. Possible values: add, create, update, and delete.  |
| type | keyword | The type of the action. Possible values: status, create\_case, and delete\_case. |
| payload.status | keyword | The new status. Possible values: open, in-progress, closed. |
| payload.tags | keyword | The new tags |
| payload.category | keyword | The new category. |
| payload.severity | keyword | The new severity. Possible values: low, medium, high, critical. |
| created\_at | date | The date of case creation in ISO 8601 \[2\] format |
| created\_at\_ms | long |  |
| created\_by.username | keyword | The username of the user who created the case |
| created\_by.profile\_uid | keyword | The profile UUID of the user who created the case |
| created\_by.full\_name | keyword | The full name of the user who created the case |
| created\_by.email | keyword | The email of the user who created the case |
| owner | keyword | The owner of the case |
| space\_ids | keyword | The list of spaces the case is visible. |