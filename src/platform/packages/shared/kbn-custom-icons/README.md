# @kbn/custom-icons

A utility package, `@kbn/custom-icons`, that provides components for rendering icons related to Elastic Agents, Cloud Providers and more.

## Components

### `<AgentIcon />`

```jsx
<AgentIcon agentName={agentName} />
```

This component renders an icon corresponding to the specified Elastic Agent name (`agentName`).

#### Props

- **`agentName`**: The name of the Elastic Agent for which the icon should be rendered.

### `<CloudProviderIcon />`

```jsx
<CloudProviderIcon cloudProvider={cloudProvider} />
```

This component renders an icon associated with the specified Cloud Provider (`cloudProvider`).

#### Props

- **`cloudProvider`**: The name of the Cloud Provider for which the icon should be rendered.
