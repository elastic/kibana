First, looks great and a great discussion overall.

Just a thought I have - since we are already discussing the `registerTrigger` too (#14420) and we already had few discussions of how to treat Kibana entities as first-class citizens (e.g. dashboards, cases, etc) - maybe we can generalize this concept to add some `entityRegistry` extension so, instead of defining the "business logic" of handling entities (such as agent or dashboard) in the step registration, you will be able to define it once in the `entityRegistry`, and then reuse it. We also started discussing Kibana entities in workflow inputs so it could be re-used there too.

Imagine the case where you want to:
- Trigger a workflow whenever a case changes (`case.updated` trigger)
- Register a `cases.get` step to fetch case details
- Define workflow inputs that accept a case entity

In the proposed solution, **each of these would need to duplicate** the case schema and resolution logic:

### Trigger registration - define case schema:

```typescript
triggerRegistry.register({
  type: 'case.updated',
  payloadSchema: z.object({
    case: z.object({
      id: z.string(),
      title: z.string(),
      status: z.enum(['open', 'in-progress', 'closed']),
      assignees: z.array(z.string()),
    }),
    previousStatus: z.string(),
    newStatus: z.string(),
  }),
});
```

### Step registration - duplicate case schema & add resolution:

```typescript
const getCaseStep = createPublicStepDefinition({
  id: 'cases.get',
  inputSchema: z.object({ caseId: z.string() }),
  // Duplicate: same schema as triggers
  outputSchema: z.object({
    case: z.object({
      id: z.string(),
      title: z.string(),
      status: z.enum(['open', 'in-progress', 'closed']),
      assignees: z.array(z.string()),
    }),
  }),
  editorHandlers: {
    input: {
      'caseId': {
        selection: {
          // Need to define search logic
          search: async (input, ctx) => {
            const cases = await casesService.search(input);
            return cases.map((c) => ({
              value: c.id,
              label: c.title,
              description: c.status,
            }));
          },
          // Need to define resolve logic
          resolve: async (value, ctx) => {
            const caseData = await casesService.get(value);
            if (!caseData) return null;
            return { value: caseData.id, label: caseData.title };
          },
          // Need to define links
          getDetails: (value, ctx, option) => ({
            message: option ? `Case: ${option.label}` : `Case "${value}" not found`,
            links: [
              { text: 'View case', path: `/app/security/cases/${option?.value}` },
              { text: 'All cases', path: `/app/security/cases` },
            ],
          }),
        },
      },
    },
  },
});
```

### Workflow inputs - duplicate case schema again:

```yaml
inputs:
  properties:
    targetCase:
      type: object
      description: "The case to process"
      properties:
        id:
          type: string
        title:
          type: string
        status:
          type: string
          enum: ['open', 'in-progress', 'closed']
        assignees:
          type: array
          items:
            type: string
```

---

But if we add the `entityRegistry`, you could:

### Register entity once:

```typescript
entityRegistry.register({
  type: 'case',
  schema: z.object({
    id: z.string(),
    title: z.string(),
    status: z.enum(['open', 'in-progress', 'closed']),
    assignees: z.array(z.string()),
  }),
  idField: 'id',
  labelField: 'title',
  descriptionField: 'status',
  operations: {
    search: (query, ctx) => casesService.search(query),
    resolve: (id, ctx) => casesService.get(id),
  },
  routes: {
    view: (id) => `/app/security/cases/${id}`,
    management: () => `/app/security/cases`,
  },
});
```

### Trigger registration - just reference entity:

```typescript
triggerRegistry.register({
  type: 'case.updated',
  payloadSchema: z.object({
    case: entityRef('case'),  // Schema resolved from entity registry
    previousStatus: z.string(),
    newStatus: z.string(),
  }),
});
```

### Step registration - just reference entity:

```typescript
const getCaseStep = createPublicStepDefinition({
  id: 'cases.get',
  inputSchema: z.object({ caseId: z.string() }),
  outputSchema: z.object({ case: entityRef('case') }),
  editorHandlers: {
    input: {
      'caseId': { selection: { entityType: 'case' } },
    },
  },
});
```

### Workflow inputs - just reference entity:

```yaml
inputs:
  properties:
    targetCase:
      $ref: entityRef('case')
      description: "The case to process"
```

---

The entity registry becomes a shared foundation that triggers, steps, and workflow inputs all consume - avoiding duplication and ensuring consistency across the platform.

### Bonus: Typed Autocomplete Between Steps

The entity registry also enables **typed autocomplete between steps**:

```yaml
on:
  event:
    trigger: case.updated
    where: event.case.status: "closed"

steps:
  - name: getRelatedCase
    type: cases.get
    with:
      caseId: "{{ event.case.relatedCaseId }}"

  - name: notify
    type: notification.send
    with:
      title: "Case closed: {{ event.case.title }}"
      #                                   ^ autocomplete from trigger's entityRef
      
      related: "{{ steps.getRelatedCase.output.case.title }}"
      #                                              ^ autocomplete from step's entityRef
```

The editor can provide autocomplete for `case.title`, `case.status`, `case.assignees`, etc. - because it knows from the entity registry what fields a case has, whether it came from a trigger payload, a step output, or a workflow input.
