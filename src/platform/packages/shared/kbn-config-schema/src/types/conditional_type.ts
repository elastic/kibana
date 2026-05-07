/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isEqual } from 'lodash';
import typeDetect from 'type-detect';
import { z as zod } from '@kbn/zod';

import { Reference } from '../references';
import type { ExtendsDeepOptions, SchemaValidationOptions } from './interfaces';
import type { TypeOptions } from './interfaces';
import { LiteralType } from './literal_type';
import { NeverType } from './never_type';
import { Type } from './type';

export type ConditionalTypeValue = string | number | boolean | object | null;

export class ConditionalType<A extends ConditionalTypeValue, B, C> extends Type<B | C> {
  private readonly leftOperand: Reference<A>;
  private readonly rightOperand: Reference<A> | A | Type<unknown>;
  private readonly equalType: Type<B>;
  private readonly notEqualType: Type<C>;
  private readonly conditionalOptions?: TypeOptions<B | C>;

  constructor(
    leftOperand: Reference<A>,
    rightOperand: Reference<A> | A | Type<unknown>,
    equalType: Type<B>,
    notEqualType: Type<C>,
    options?: TypeOptions<B | C>
  ) {
    super(zod.any(), options);
    this.leftOperand = leftOperand;
    this.rightOperand = rightOperand;
    this.equalType = equalType;
    this.notEqualType = notEqualType;
    this.conditionalOptions = options;
  }

  private resolveConditionalDefault(): B | C {
    const def = this.typeOptions.defaultValue;
    if (typeof def === 'function') {
      return (def as () => B | C)();
    }
    if (Reference.isReference(def)) {
      return def.resolve() as B | C;
    }
    return def as B | C;
  }

  protected validateWithFrame(
    _frame: import('../validation_frame').ValidationFrame,
    value: unknown,
    context: Record<string, unknown>,
    namespace?: string,
    validationOptions?: SchemaValidationOptions
  ): B | C {
    const originalVal = value;

    const leftVal = this.leftOperand.resolve() as A;
    let matches = false;

    if (Reference.isReference(this.rightOperand)) {
      matches = isEqual(leftVal, (this.rightOperand as Reference<A>).resolve());
    } else if (this.rightOperand instanceof Type) {
      try {
        this.rightOperand.validate(leftVal, context, undefined, validationOptions);
        matches = true;
      } catch {
        matches = false;
      }
    } else {
      matches = isEqual(leftVal, this.rightOperand);
    }

    const branch = matches ? this.equalType : this.notEqualType;

    // Apply conditional-level defaultValue only when it matches legacy Joi/offering semantics:
    // – inactive branch is `never()` → inject default without validating "no value may appear".
    // – fixed literal branch (`literal(false)` etc.) with matching default → emit that fixed value.
    // – otherwise, only substitute `undefined` with the conditional default when the branch schema has no
    //   `defaultValue` of its own (so `boolean({ defaultValue: true })` still sees `undefined`).
    if (originalVal === undefined && this.typeOptions.defaultValue !== undefined) {
      const condDef = this.resolveConditionalDefault();
      if (branch instanceof NeverType) {
        return condDef;
      }
      if (branch instanceof LiteralType && Object.is(condDef, branch.expectedValue)) {
        return condDef;
      }
    }

    let valToValidate = originalVal;
    if (
      originalVal === undefined &&
      this.typeOptions.defaultValue !== undefined &&
      !branch.hasOwnDefaultValue()
    ) {
      valToValidate = this.resolveConditionalDefault();
    }

    return branch.validate(valToValidate, context, namespace, validationOptions) as B | C;
  }

  public extendsDeep(options: ExtendsDeepOptions) {
    return new ConditionalType(
      this.leftOperand,
      this.rightOperand,
      this.equalType.extendsDeep(options),
      this.notEqualType.extendsDeep(options),
      this.conditionalOptions
    );
  }

  public addLazyRegistryEntries(map: Map<string, unknown>): void {
    this.equalType.addLazyRegistryEntries(map);
    this.notEqualType.addLazyRegistryEntries(map);
    if (this.rightOperand instanceof Type) {
      this.rightOperand.addLazyRegistryEntries(map);
    }
  }

  protected handleError(type: string, { value }: Record<string, any>) {
    if (type === 'any.required' || type === 'invalid_type') {
      return `expected at least one defined value but got [${typeDetect(value)}]`;
    }
  }

  public getSchemaStructure() {
    const a = this.equalType.getStructureLabel();
    const b = this.notEqualType.getStructureLabel();
    const type = a === b ? a : `${a}|${b}`;
    return [{ path: [], type }];
  }

  protected structureTypeLabel(): string {
    const a = this.equalType.getStructureLabel();
    const b = this.notEqualType.getStructureLabel();
    return a === b ? a : `${a}|${b}`;
  }
}
