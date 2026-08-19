# Kibana review guidance

- Treat shared UI components as encapsulated APIs. Flag changes that depend on private DOM structure, internal or generated class names, or unsupported style overrides that can break when the component changes. Prefer public props and composition points; when an owned component is changed in the same pull request, prefer extending its public API.
