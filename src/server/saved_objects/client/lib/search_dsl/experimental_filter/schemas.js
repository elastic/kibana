import Joi from 'joi';

const dateOrNumber = Joi.alternatives().try(
  Joi.number(),
  Joi.date().iso()
);

const valueFilterSchema = Joi.object().keys({
  field: Joi.string().optional(),
  value: Joi.alternatives()
    .try(Joi.string(), Joi.boolean(), Joi.number())
    .required(),
}).required();

const rangeFilterSchema = Joi.object().keys({
  field: Joi.string().required(),
  gt: dateOrNumber,
  gte: dateOrNumber,
  lt: dateOrNumber,
  lte: dateOrNumber,
})
  .nand('gt', 'gte')
  .nand('lt', 'lte')
  .required();

const boolFilterSchema = Joi.object().keys({
  must: Joi.array().optional(),
  must_not: Joi.array().optional(),
  must_some: Joi.array().optional(),
}).required();

export const SCHEMAS = {
  bool: boolFilterSchema,
  value: valueFilterSchema,
  range: rangeFilterSchema,
};
