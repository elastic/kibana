# Remote JSON Schema Reference Architecture

## Architecture Overview

```mermaid
graph TB
    subgraph "Workflow Definition Layer"
        A[Workflow YAML] -->|Defines inputs with $ref| B[Input Schema]
        B -->|Supports multiple reference types| C{Reference Type}
    end

    subgraph "Reference Types Supported"
        C -->|Local| D["#/definitions/User<br/>JSON Pointer"]
        C -->|Remote HTTP| E["https://api.example.com/schemas/user.json<br/>Absolute URI"]
        C -->|Remote with Fragment| F["https://api.example.com/schemas.json#/definitions/User<br/>URI + JSON Pointer"]
        C -->|Local Repository| G["/api/workflows/types-registry.json#/definitions/User<br/>Internal API"]
        C -->|Relative Path| H["./schemas/address.json<br/>Relative URI"]
    end

    subgraph "Schema Resolution Engine"
        I[normalizeInputsToJsonSchemaAsync] -->|Detects refs| J{Has References?}
        J -->|No| K[Return Schema As-Is]
        J -->|Yes| L{Has Remote Refs?}
        
        L -->|Yes| M[resolveRemoteRefsInBrowser]
        M -->|Fetch via HTTP| N[Remote Schema Registry]
        M -->|Inline fetched schemas| O[Schema with Remote Refs Resolved]
        
        L -->|No| O
        O -->|Check local refs| P{Has Local Refs?}
        
        P -->|Yes| Q[$RefParser.dereference]
        Q -->|Resolve JSON Pointers| R[Fully Resolved Schema]
        P -->|No| R
    end

    subgraph "Value Delivery Points"
        R -->|Validated Schema| S[Workflow Execution Engine]
        R -->|Type-safe Validation| T[Zod Validator]
        R -->|IntelliSense| U[Monaco Editor Autocomplete]
        R -->|Default Values| V[Input Form Pre-filling]
        R -->|Schema Validation| W[YAML Validation]
    end

    subgraph "Benefits & Value"
        X[Schema Reusability<br/>Share across workflows]
        Y[Centralized Management<br/>Single source of truth]
        Z[Type Safety<br/>Compile-time validation]
        AA[Developer Experience<br/>Autocomplete & validation]
        AB[Maintainability<br/>Update once, use everywhere]
        AC[Standards Compliance<br/>JSON Schema spec compliant]
    end

    S --> X
    T --> Z
    U --> AA
    V --> AA
    W --> Y
    R --> AB
    R --> AC

    style A fill:#e1f5ff
    style R fill:#c8e6c9
    style X fill:#fff9c4
    style Y fill:#fff9c4
    style Z fill:#fff9c4
    style AA fill:#fff9c4
    style AB fill:#fff9c4
    style AC fill:#fff9c4
```

## Reference Resolution Flow

```mermaid
sequenceDiagram
    participant WF as Workflow YAML
    participant Normalize as normalizeInputsToJsonSchemaAsync
    participant Resolver as resolveAllReferences
    participant Remote as resolveRemoteRefsInBrowser
    participant HTTP as HTTP Fetch
    participant Local as $RefParser
    participant Validator as Zod Validator
    participant Editor as Monaco Editor
    participant Exec as Execution Engine

    WF->>Normalize: Input schema with $ref
    Normalize->>Resolver: Check for references
    
    alt Remote Reference Detected
        Resolver->>Remote: hasRemoteRefs() = true
        Remote->>HTTP: Fetch remote schema
        HTTP-->>Remote: JSON Schema response
        Remote->>Remote: Inline remote refs
        Remote-->>Resolver: Schema with remote refs resolved
    end
    
    alt Local Reference Detected
        Resolver->>Local: dereference() for local refs
        Local->>Local: Resolve JSON Pointers (#/definitions/...)
        Local-->>Resolver: Fully dereferenced schema
    end
    
    Resolver-->>Normalize: Fully resolved schema
    Normalize-->>Validator: Create Zod schema
    Normalize-->>Editor: Provide for autocomplete
    Normalize-->>Exec: Apply defaults & validate
    
    Validator->>Validator: Runtime validation
    Editor->>Editor: IntelliSense suggestions
    Exec->>Exec: Execute with validated inputs
```

## Reference Type Examples

```mermaid
graph LR
    subgraph "Local Reference"
        A1[Workflow YAML] -->|"$ref: '#/definitions/User'"| A2[Local definitions]
        A2 -->|JSON Pointer| A3[Resolved inline]
    end

    subgraph "Remote HTTP"
        B1[Workflow YAML] -->|"$ref: 'https://api.example.com/schemas/user.json'"| B2[HTTP Request]
        B2 -->|Fetch| B3[Remote Schema]
        B3 -->|Inline| B4[Resolved Schema]
    end

    subgraph "Remote with Fragment"
        C1[Workflow YAML] -->|"$ref: 'https://api.example.com/schemas.json#/definitions/User'"| C2[HTTP Request]
        C2 -->|Fetch| C3[Remote Schema]
        C3 -->|Extract fragment| C4[JSON Pointer Resolution]
        C4 -->|Inline specific definition| C5[Resolved Schema]
    end

    subgraph "Internal API"
        D1[Workflow YAML] -->|"$ref: '/api/workflows/types-registry.json#/definitions/User'"| D2[Kibana API]
        D2 -->|Internal fetch| D3[Types Registry]
        D3 -->|Resolve & inline| D4[Resolved Schema]
    end

    style A3 fill:#c8e6c9
    style B4 fill:#c8e6c9
    style C5 fill:#c8e6c9
    style D4 fill:#c8e6c9
```

## Integration Architecture

```mermaid
graph TB
    subgraph "Frontend Integration"
        FE1[Workflow YAML Editor] -->|Monaco Editor| FE2[Autocomplete Provider]
        FE2 -->|resolveAllReferences| FE3[Schema Resolution]
        FE3 -->|Property suggestions| FE4[IntelliSense]
        
        FE5[Run Workflow Modal] -->|normalizeInputsToJsonSchemaAsync| FE3
        FE3 -->|Resolved schema| FE6[Zod Validator]
        FE6 -->|Validation| FE7[Form with defaults]
    end

    subgraph "Backend Integration"
        BE1[Workflow Execution] -->|buildWorkflowContext| BE2[normalizeInputsToJsonSchemaAsync]
        BE2 -->|Resolved schema| BE3[applyInputDefaults]
        BE3 -->|Validated inputs| BE4[Workflow Context]
        BE4 -->|Runtime| BE5[Step Execution]
    end

    subgraph "Validation Integration"
        VAL1[YAML Validation] -->|validateJsonSchemaDefaults| VAL2[normalizeInputsToJsonSchemaAsync]
        VAL2 -->|Resolved schema| VAL3[Default validation]
        VAL3 -->|Errors| VAL4[Editor markers]
    end

    FE3 -.->|Same resolution logic| BE2
    BE2 -.->|Same resolution logic| VAL2

    style FE4 fill:#fff9c4
    style FE7 fill:#fff9c4
    style BE4 fill:#c8e6c9
    style VAL4 fill:#ffcdd2
```

## Value Proposition Matrix

```mermaid
graph TB
    subgraph "Business Value"
        BV1[Reduced Duplication<br/>DRY Principle]
        BV2[Faster Development<br/>Reuse existing schemas]
        BV3[Consistency<br/>Standardized types]
        BV4[Maintainability<br/>Update once, propagate everywhere]
    end

    subgraph "Technical Value"
        TV1[Type Safety<br/>Compile-time validation]
        TV2[Standards Compliance<br/>JSON Schema spec]
        TV3[Flexibility<br/>Multiple reference types]
        TV4[Performance<br/>Lazy resolution, caching]
    end

    subgraph "Developer Experience"
        DX1[Autocomplete<br/>IntelliSense in editor]
        DX2[Validation<br/>Real-time error checking]
        DX3[Documentation<br/>Schema descriptions]
        DX4[Default Values<br/>Auto-populated forms]
    end

    BV1 -->|Enables| TV1
    BV2 -->|Enables| DX1
    BV3 -->|Enables| TV2
    BV4 -->|Enables| TV4

    TV1 -->|Provides| DX2
    TV2 -->|Enables| DX3
    TV3 -->|Enables| DX1
    TV4 -->|Enables| DX4

    style BV1 fill:#e3f2fd
    style BV2 fill:#e3f2fd
    style BV3 fill:#e3f2fd
    style BV4 fill:#e3f2fd
    style TV1 fill:#c8e6c9
    style TV2 fill:#c8e6c9
    style TV3 fill:#c8e6c9
    style TV4 fill:#c8e6c9
    style DX1 fill:#fff9c4
    style DX2 fill:#fff9c4
    style DX3 fill:#fff9c4
    style DX4 fill:#fff9c4
```

## Reference Type Use Cases

| Reference Type | Use Case | Example | Benefits |
|---------------|----------|---------|----------|
| **Local (`#/definitions/...`)** | Workflow-specific types | `$ref: "#/definitions/User"` | Simple, self-contained |
| **Remote HTTP** | External schema registry | `$ref: "https://api.example.com/schemas/user.json"` | Centralized, versioned |
| **Remote with Fragment** | Shared schema repository | `$ref: "https://api.example.com/schemas.json#/definitions/User"` | Efficient, selective |
| **Internal API** | Kibana types registry | `$ref: "/api/workflows/types-registry.json#/definitions/User"` | Internal, controlled |
| **Relative Path** | Local file system | `$ref: "./schemas/address.json"` | Organized, modular |

## Architecture Principles

1. **Lazy Resolution**: References are only resolved when needed
2. **Graceful Degradation**: Falls back to original schema if resolution fails
3. **Browser Compatibility**: Uses `fetch` API for cross-platform support
4. **Security**: File system access disabled, HTTP-only for remote refs
5. **Performance**: Early returns for schemas without references
6. **Standards Compliance**: Full JSON Schema specification support
