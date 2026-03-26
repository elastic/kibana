# Workflow Execution Engine Library

## URL Validator

The `UrlValidator` class provides URL validation functionality for the HTTP step in workflows. It ensures that HTTP requests are only made to allowed hosts based on configuration.

### Configuration

The URL validation is configured through the workflow execution engine's configuration:

```yaml
# kibana.yml
workflowsExecutionEngine:
  http:
    allowedHosts:
      - "api.example.com"
      - "webhook.service.com"
      - "*"  # Allow all hosts (use with caution)
```

### Usage

The URL validator is automatically used by the HTTP step implementation to validate URLs before making requests.

### Security

This validation helps protect self-managed Kibana installations by:

1. **Preventing SSRF attacks** - Blocks requests to internal/localhost addresses unless explicitly allowed
2. **Controlling external access** - Only allows requests to pre-approved external services
3. **Compliance** - Helps meet security requirements by controlling outbound traffic

### Default Configuration

By default, the `allowedHosts` configuration is set to `["*"]` which allows all hosts. For production deployments, it's recommended to specify only the hosts that are actually needed.

### Error Handling

When a URL is blocked:
1. The HTTP request is not made
2. An error is logged with security tags
3. The workflow step completes with an error result
4. The workflow continues to the next step

This ensures that workflows don't fail completely due to URL validation issues, but the errors are properly logged for security monitoring.
