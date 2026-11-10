/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  CustomValidator,
  ErrorSchema,
  ErrorTransformer,
  RJSFSchema,
  RJSFValidationError,
  UiSchema,
  ValidationData,
  ValidatorType,
} from '@rjsf/utils';
import { ErrorSchemaBuilder, toErrorList } from '@rjsf/utils';
import type { JSONSchema7 } from 'json-schema';
import { convertJsonSchemaToZod } from '@kbn/workflows/spec/lib/build_fields_zod_validator';
import { matchesPageInputCondition, validatePageInputs } from '@kbn/workflows/spec/lib/page_inputs';
import type { PageInputs } from '@kbn/workflows/spec/schema/triggers/page_trigger_schema';

/** RJSF hands the validator untyped form data; the shared validator checks its shape. */
type PageFormData = unknown;

const toProperty = (path: string[]) => path.map((segment) => `.${segment}`).join('');

/**
 * RJSF validator backed by the same code that checks the submission on the server.
 *
 * `@rjsf/validator-ajv8` cannot run here: Ajv compiles schemas with `new Function`, and
 * the Kibana CSP has no `unsafe-eval`. Sharing `validatePageInputs` also means the form
 * and the server agree on what `if`/`then` require.
 */
export class PageFormValidator implements ValidatorType<PageFormData, RJSFSchema> {
  /**
   * @param pageSchema The schema as the page declares it. RJSF gets a copy without
   * `format` (see `toRenderSchema`), so validation uses this one.
   */
  constructor(private readonly pageSchema?: PageInputs) {}

  validateFormData(
    formData: PageFormData | undefined,
    schema: RJSFSchema,
    customValidate?: CustomValidator<PageFormData, RJSFSchema>,
    transformErrors?: ErrorTransformer<PageFormData, RJSFSchema>,
    uiSchema?: UiSchema<PageFormData, RJSFSchema>
  ): ValidationData<PageFormData> {
    const result = validatePageInputs(this.pageSchema ?? (schema as PageInputs), formData ?? {});
    const builder = new ErrorSchemaBuilder<PageFormData>();
    let errors: RJSFValidationError[] = [];
    if (!result.success) {
      errors = result.issues.map(({ path, message }) => {
        builder.addErrors(message, path);
        const property = toProperty(path);
        return { name: 'page', message, property, stack: `${property} ${message}`.trim() };
      });
    }
    if (transformErrors) {
      errors = transformErrors(errors, uiSchema);
    }
    return { errors, errorSchema: builder.ErrorSchema };
  }

  toErrorList(errorSchema?: ErrorSchema<PageFormData>, fieldPath: string[] = []) {
    return toErrorList<PageFormData>(errorSchema, fieldPath);
  }

  /** RJSF calls this to evaluate `if` conditions and to match `oneOf` options. */
  isValid(schema: RJSFSchema, formData: PageFormData | undefined): boolean {
    const jsonSchema = schema as JSONSchema7;
    if (jsonSchema.properties || jsonSchema.required) {
      return matchesPageInputCondition(jsonSchema, formData);
    }
    return convertJsonSchemaToZod(jsonSchema).safeParse(formData).success;
  }

  rawValidation<Result = unknown>(schema: RJSFSchema, formData?: PageFormData) {
    const result = validatePageInputs(this.pageSchema ?? (schema as PageInputs), formData ?? {});
    return { errors: (result.success ? [] : result.issues) as Result[] };
  }
}
