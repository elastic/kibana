# Content management

The content management plugin provides functionality to manage content in Kibana.

Do not use this for new content types. Use the saved-objects client. This README is for maintaining types that already go through content management.

## Testing

Many parts of the service are in-memory, so large pieces can be covered with Jest.
