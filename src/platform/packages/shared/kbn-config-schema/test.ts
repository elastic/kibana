import { TypeOf, schema } from '@kbn/config-schema';
import _ from 'lodash';

const testSchemaObject = schema.object({
    a: schema.string(),
    b: schema.number({ defaultValue: 5 }),
    c: schema.maybe(schema.boolean()),
});

const testSchemaAllOf = schema.allOf([
    testSchemaObject,
    schema.object({
        d: schema.string(),
        e: schema.number({ defaultValue: 3 }),
        f: schema.maybe(schema.boolean()) 
    }),
])

const testSchemaObjectInput = testSchemaObject.getInputSchema();
const testSchemaAllOfInput = testSchemaAllOf.getInputSchema();

type TestSchemaObjectInputType = typeof testSchemaObjectInput.type;
type TestSchemaAllOfInputType = typeof testSchemaAllOfInput.type;

const testObject: TestSchemaObjectInputType = {
    a: 'hello',
    // b is optional because it has a default value
    // c is optional because it's maybe
};

// complains that b is missing
