import { schema } from ".";
import { TypeOf, TypeOfInput, TypeOfOutput } from "./src/types/type_of";


//------- Simple Case

const num = schema.number();

num._input // number
num._output // number

const numD = schema.number({ defaultValue: 2 });

numD._input // number | undefinded
numD._output // number

//------- Complex Case - Object

const testingSchema = schema.object(
  {
    id: schema.number({
      // defaultValue: 2,
    }),
    idm: schema.maybe(schema.number({
      // defaultValue: 2,
    })),
    num: schema.number({
      defaultValue: 2,
    }),
    obj: schema.object(
      {
        test1: schema.number({
          // defaultValue: 1,
        }),
        test2: schema.number({
          defaultValue: 2,
        }),
      },
      {
        defaultValue: {
          test1: 1,
        },
      }
    ),
  },
  {
    // meta: {
    //   id: '123',
    //   deprecated: true,
    // },
    // defaultValue: {
    //   id: 1,
    //   // idm: 'undefined',
    //   // id: 1,
    //   // obj: {
    //   //   test: 1,
    //   // },
    //   // num: 1,
    // },
  }
);

export type Simplify<T> = { [KeyType in keyof T]: T[KeyType] } & {};

const rawType = null! as typeof testingSchema;

const type = null! as Simplify<TypeOf<typeof testingSchema>>;

const inn = null! as Simplify<TypeOfInput<typeof testingSchema>>;

const out = null! as Simplify<TypeOfOutput<typeof testingSchema>>;

type.id;

out.id;

inn.num;
out.num;

if (inn.obj) {
  inn.obj.test1;
  inn.obj.test2;

  out.obj.test1;
  out.obj.test2;
}
