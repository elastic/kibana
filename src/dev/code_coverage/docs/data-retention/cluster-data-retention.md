# Add 90 day data rentention policy
### PUT _ilm/policy/coverage-retention
```json
{
  "policy": {
    "phases": {
      "hot": {
        "actions": {
          "set_priority": {
            "priority": 100
          }
        },
        "min_age": "0ms"
      },
      "delete": {
        "min_age": "90d",
        "actions": {
          "delete": {}
        }
      }
    }
  }
}
```