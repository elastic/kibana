# How to contribute

This is Kibana's slightly customised version of `zod`. We use this library to wrap
`zod` types with certain useful functionality like printing error messages in a
certain format or introducing custom types for all Kibana to use.

If you want to update an error message add a new type to `./src` and then make
sure that your customized version of the `zod` type is mixed-in to our internal
`zod` namespace. See `./src/zod.ts`.
