# @elastic/analytics

This module implements the Analytics client used for Event-Based Telemetry. The intention of the client is to be usable on both: the UI and the Server sides.

## How to use it

It all starts by creating the client with the `createAnalytics` API:

```typescript
import { createAnalytics } from '@elastic/analytics';

const analytics = createAnalytics({
  // Set to `true` when running in developer mode.
  // It enables development helpers like schema validation and extra debugging features.
  isDev: false,
  // Set to `staging` if you don't want your events to be sent to the production cluster. Useful for CI & QA environments.
  sendTo: 'production',
  // The application's instrumented logger 
  logger,
});
```

### Reporting events

Reporting events is as simple as calling the `reportEvent` API every time your application needs to track an event:

```typescript
analytics.reportEvent('my_unique_event_name', myEventProperties);
```

But first, it requires a setup phase where the application must declare the event and the structure of the `eventProperties`:

```typescript
analytics.registerEventType({
  eventType: 'my_unique_event_name',
  schema: {
    my_keyword: {
      type: 'keyword',
      _meta: {
        description: 'Represents the key property...'
      }
    },
    my_number: {
      type: 'long',
      _meta: {
        description: 'Indicates the number of times...',
        optional: true
      }
    },
    my_complex_unknown_meta_object: {
      type: 'pass_through',
      _meta: {
        description: 'Unknown object that contains the key-values...'
      }
    },
    my_array_of_str: {
      type: 'array',
      items: {
        type: 'text',
        _meta: {
          description: 'List of tags...'
        }
      }
    },
    my_object: {
      properties: {
        my_timestamp: {
          type: 'date',
          _meta: {
            description: 'timestamp when the user...'
          }
        }
      }
    },
    my_array_of_objects: {
      type: 'array',
      items: {
        properties: {
          my_bool_prop: {
            type: 'boolean',
            _meta: {
              description: '`true` when...'
            }
          }
        }
      }
    }
  }
});
```

For more information about how to declare the schemas, refer to the section [Schema definition](#schema-definition).

### Enriching events

Context is important! For that reason, the client internally appends the timestamp in which the event was generated and any additional context provided by the Context Providers. To register a context provider use the `registerContextProvider` API:

```typescript
analytics.registerContextProvider({
  // RxJS Observable that emits every time the context changes. For example: a License changes from `basic` to `trial`.
  context$,
  // Similar to the `reportEvent` API, schema defining the structure of the expected output of the context$ observable.
  schema,
})
```

### Setting the user's opt-in consent

The client cannot send any data until the user provides consent. At the beginning, the client will internally enqueue any incoming events until the consent is either granted or refused. 

To set the user's selection use the `optIn` API:

```typescript
analytics.optIn({
  global: {
    enabled: true, // The user granted consent
    shippers: {
      shipperA: false, // Shipper A is explicitly disabled for all events
    }
  },
  event_types: {
    my_unique_event_name: {
      enabled: true, // The consent is explictly granted to send this type of event (only if global === true)
      shippers: {
        shipperB: false, // Shipper B is not allowed to report this event.
      }
    },
    my_other_event_name: {
      enabled: false, // The consent is not granted to send this type of event.
    }
  }
})
```

### Shipping events

In order to report the event to an analytics tool, we need to register the shippers our application wants to use. To register a shipper use the API `registerShipper`:

```typescript
analytics.registerShipper(ShipperClass, shipperOptions);
```

There are some prebuilt shippers in this package that can be enabled using the API above. Additionally, each application can register their own custom shippers.

#### Prebuilt shippers

TODO when actually implemented

#### Custom shippers

To use your own shipper, you just need to implement and register it!:

```typescript
import type { 
  AnalyticsClientInitContext, 
  Event, 
  EventContext, 
  IShipper, 
  TelemetryCounter 
} from '@elastic/analytics';

class MyVeryOwnShipper implements IShipper {
  constructor(myOptions: MyOptions, initContext: AnalyticsClientInitContext) {
    // ...
  }

  reportEvents = (events: Event[]): void => {
    // Send the events to the analytics platform
  }
  optIn = (isOptedIn: boolean): void => {
    // Start/stop any sending mechanisms
  }
  
  extendContext = (newContext: EventContext): void => {
    // Call any custom APIs to internally set the context
  }
  
  // Emit any success/failed/dropped activity
  telemetryCounter$: Observable<TelemetryCounter>;
}

// Register the custom shipper
analytics.registerShipper(MyVeryOwnShipper, myOptions);
```

### Schema definition

Schemas are a framework that allows us to document the structure of the events that our application will report. It is useful to understand the meaning of the events that we report. And, at the same time, it serves as an extra validation step from the developer's point of view.

The syntax of a schema is a _simplified ES mapping on steroids_: it removes some of the ES mapping complexity, and at the same time, it includes features that are specific to the telemetry collection. 

**DISCLAIMER:** **The schema is not a direct mapping to ES indices.** The final structure of how the event is stored will depend on many factors like the context providers, shippers and final analytics solution.

#### Schema Specification: First order data types (`string`, `number`, `boolean`)

When declaring first-order values like `string` or `number`, the basic schema must contain both: `type` and `_meta`.

The `type` value depends on the type of the content to report in that field. Refer to the table below for the values allowed in the schema `type`:

| Typescript `type` |      Schema `type`      |
|:-----------------:|:-----------------------:|
|     `boolean`     |        `boolean`        |
|     `string`      |        `keyword`        |
|     `string`      |         `text`          |
|     `string`      | `date` (for ISO format) |
|     `number`      | `date` (for ms format)  |
|     `number`      |         `byte`          |
|     `number`      |         `short`         |
|     `number`      |        `integer`        |
|     `number`      |         `long`          |
|     `number`      |        `double`         |
|     `number`      |         `float`         |

```typescript
const stringSchema: SchemaValue<string> = {
  type: 'text',
  _meta: {
    description: 'Description of the feature that was broken',
    optional: false,
  },
}
```

For the `_meta`, refer to [Schema Specification: `_meta`](#schema-specification-_meta).

#### Schema Specification: Objects

Declaring the schema of an object contains 2 main attributes: `properties` and an optional `_meta`:  

The `properties` attribute is an object with all the keys that the original object may include:

```typescript
interface MyObject {
  an_id: string;
  a_description: string;
  a_number?: number;
  a_boolean: boolean;
}

const objectSchema: SchemaObject<MyObject> = {
  properties: {
    an_id: {
      type: 'keyword',
      _meta: {
        description: 'The ID of the element that generated the event',
        optional: false,
      },
    },
    a_description: {
      type: 'text',
      _meta: {
        description: 'The human readable description of the element that generated the event',
        optional: false,
      },
    },
    a_number: {
      type: 'long',
      _meta: {
        description: 'The number of times the element is used',
        optional: true,
      },
    },
    a_boolean: {
      type: 'boolean',
      _meta: {
        description: 'Is the element still active',
        optional: false,
      },
    },
  },
  _meta: {
    description: 'MyObject represents the events generated by elements in the UI when ...',
    optional: false,
  }
}
```

For the optional `_meta`, refer to [Schema Specification: `_meta`](#schema-specification-_meta).

#### Schema Specification: Arrays

Declaring the schema of an array contains 2 main attributes: `items` and an optional `_meta`:

The `items` attribute is an object declaring the schema of the elements inside the array. At the moment, we only support arrays of one type, so `Array<string | number>` are not allowed.

```typescript
type MyArray = string[];

const arraySchema: SchemaArray<MyArray> = {
  items:  {
    type: 'keyword',
    _meta: {
      description: 'Tag attached to the element...',
      optional: false,
    },
  },
  _meta: {
    description: 'List of tags attached to the element...',
    optional: false,
  }
}
```

For the optional `_meta`, refer to [Schema Specification: `_meta`](#schema-specification-_meta).

#### Schema Specification: Special type `pass_through`

In case a property in the schema is just used to pass through some unknown content that is declared and validated somewhere else, or that it can dynamically grow and shrink, you may use the `type: 'pass_through'` option. It behaves like a [first-order data type](#schema-specification-first-order-data-types-string-number-boolean):

```typescript
type MyUnknownType = unknown;

const passThroughSchema: SchemaValue<MyUnknownType> = {
  type: 'pass_through',
  _meta: {
    description: 'Payload context recevied from the HTTP request...',
    optional: false,
  },
}
```

For the optional `_meta`, refer to [Schema Specification: `_meta`](#schema-specification-_meta).

#### Schema Specification: `_meta`

The `_meta` adds the invaluable information of a `description` and whether a field is `optional` in the payload. 

It can be attached to any schema definition as seen in the examples above. For high-order types, like arrays or objects, the `_meta` field is optional. For first-order types, like numbers, strings, booleans or `pass_through`, the `_meta` key is mandatory.

The `optional` field is optional by default, and there are some TS validations to enforce `optional: true` when the matching field is declared as optional in the types. However, it's highly encouraged to be explicit about declaring it even when the field is not optional.
