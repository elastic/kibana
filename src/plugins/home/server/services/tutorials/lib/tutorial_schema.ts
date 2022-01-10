/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { schema, TypeOf } from '@kbn/config-schema';

const dashboardSchema = schema.object({
  // Dashboard saved object id
  id: schema.string(),
  // Is this an Overview / Entry Point dashboard?
  isOverview: schema.boolean(),
  linkLabel: schema.conditional(
    schema.siblingRef('isOverview'),
    true,
    schema.string(),
    schema.maybe(schema.string())
  ),
});
export type DashboardSchema = TypeOf<typeof dashboardSchema>;

const artifactsSchema = schema.object({
  // Fields present in Elasticsearch documents created by this product.
  exportedFields: schema.maybe(
    schema.object({
      documentationUrl: schema.string(),
    })
  ),
  // Kibana dashboards created by this product.
  dashboards: schema.arrayOf(dashboardSchema),
  application: schema.maybe(
    schema.object({
      path: schema.string(),
      label: schema.string(),
    })
  ),
});
export type ArtifactsSchema = TypeOf<typeof artifactsSchema>;

const statusCheckSchema = schema.object({
  title: schema.maybe(schema.string()),
  text: schema.maybe(schema.string()),
  btnLabel: schema.maybe(schema.string()),
  success: schema.maybe(schema.string()),
  error: schema.maybe(schema.string()),
  esHitsCheck: schema.object({
    index: schema.oneOf([schema.string(), schema.arrayOf(schema.string())]),
    query: schema.recordOf(schema.string(), schema.any()),
  }),
});

const instructionSchema = schema.object({
  title: schema.maybe(schema.string()),
  textPre: schema.maybe(schema.string()),
  commands: schema.maybe(schema.arrayOf(schema.string())),
  textPost: schema.maybe(schema.string()),
  customComponentName: schema.maybe(schema.string()),
});
export type Instruction = TypeOf<typeof instructionSchema>;

const instructionVariantSchema = schema.object({
  id: schema.string(),
  instructions: schema.arrayOf(instructionSchema),
  initialSelected: schema.maybe(schema.boolean()),
});

export type InstructionVariant = TypeOf<typeof instructionVariantSchema>;

const instructionSetSchema = schema.object({
  title: schema.maybe(schema.string()),
  callOut: schema.maybe(
    schema.object({
      title: schema.string(),
      message: schema.maybe(schema.string()),
      iconType: schema.maybe(schema.string()),
    })
  ),
  // Variants (OSes, languages, etc.) for which tutorial instructions are specified.
  instructionVariants: schema.arrayOf(instructionVariantSchema),
  statusCheck: schema.maybe(statusCheckSchema),
});
export type InstructionSetSchema = TypeOf<typeof instructionSetSchema>;

const idRegExp = /^[a-zA-Z_]+$/;
const paramSchema = schema.object({
  defaultValue: schema.any(),
  id: schema.string({
    validate(value: string) {
      if (!idRegExp.test(value)) {
        return `Does not satisfy regexp ${idRegExp.toString()}`;
      }
    },
  }),
  label: schema.string(),
  type: schema.oneOf([schema.literal('number'), schema.literal('string')]),
});
export type ParamsSchema = TypeOf<typeof paramSchema>;

const instructionsSchema = schema.object({
  instructionSets: schema.arrayOf(instructionSetSchema),
  params: schema.maybe(schema.arrayOf(paramSchema)),
});
export type InstructionsSchema = TypeOf<typeof instructionsSchema>;

const tutorialIdRegExp = /^[a-zA-Z0-9-]+$/;
export const tutorialSchema = schema.object({
  id: schema.string({
    validate(value: string) {
      if (!tutorialIdRegExp.test(value)) {
        return `Does not satisfy regexp ${tutorialIdRegExp.toString()}`;
      }
    },
  }),
  category: schema.oneOf([
    schema.literal('logging'),
    schema.literal('security'),
    schema.literal('metrics'),
    schema.literal('other'),
  ]),
  name: schema.string({
    validate(value: string) {
      if (value === '') {
        return 'is not allowed to be empty';
      }
    },
  }),
  moduleName: schema.maybe(schema.string()),
  isBeta: schema.maybe(schema.boolean()),
  shortDescription: schema.string(),
  // EUI icon type string, one of https://elastic.github.io/eui/#/icons
  euiIconType: schema.maybe(schema.string()),
  longDescription: schema.string(),
  completionTimeMinutes: schema.maybe(
    schema.number({
      validate(value: number) {
        if (!Number.isInteger(value)) {
          return 'Expected to be a valid integer number';
        }
      },
    })
  ),
  previewImagePath: schema.maybe(schema.string()),
  // kibana and elastic cluster running on prem
  onPrem: instructionsSchema,
  // kibana and elastic cluster running in elastic's cloud
  elasticCloud: schema.maybe(instructionsSchema),
  // kibana running on prem and elastic cluster running in elastic's cloud
  onPremElasticCloud: schema.maybe(instructionsSchema),
  // Elastic stack artifacts produced by product when it is setup and run.
  artifacts: schema.maybe(artifactsSchema),

  // saved objects used by data module.
  savedObjects: schema.maybe(schema.arrayOf(schema.any())),
  savedObjectsInstallMsg: schema.maybe(schema.string()),
  customStatusCheckName: schema.maybe(schema.string()),

  // Category assignment for the integration browser
  integrationBrowserCategories: schema.maybe(schema.arrayOf(schema.string())),

  // Name of an equivalent package in EPR. e.g. this needs to be explicitly defined if it cannot be derived from a heuristic.
  eprPackageOverlap: schema.maybe(schema.string()),
});

export type TutorialSchema = TypeOf<typeof tutorialSchema>;
