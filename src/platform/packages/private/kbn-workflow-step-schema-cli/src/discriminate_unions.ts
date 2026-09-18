/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { JsonObject, JsonValue } from './types';
import {
  isObject,
  resolveLocalRef,
  resolveRefContainer,
  resolveTopLevelUnion,
  unwrapTemplate,
} from './schema_helpers';

/**
 * Top-level array properties whose `items` union is a discriminated union keyed
 * on a `type` literal. `steps` is the hot path (hundreds of branches); `triggers`
 * is small but gets the same treatment for consistent, branch-anchored errors.
 */
const DISCRIMINATED_PROPERTIES = ['steps', 'triggers'] as const;

/** The discriminator property every workflow union keys on. */
const DISCRIMINATOR_PROPERTY = 'type';

const UNION_ARRAY_KEYS = ['oneOf', 'anyOf'] as const;

const findUnionArrayKey = (union: JsonObject): (typeof UNION_ARRAY_KEYS)[number] | undefined =>
  UNION_ARRAY_KEYS.find((key) => Array.isArray(union[key]));

/**
 * Collect the string literal(s) a member's `type` node accepts: a bare `const`,
 * an `enum`, or those nested inside a template wrapper / `$ref` / composition
 * keyword. Returns `undefined` when no literal can be determined (the caller then
 * declines to add a discriminator rather than emit an uncompilable schema).
 */
const readTypeLiterals = (root: JsonObject, member: JsonObject): string[] | undefined => {
  const properties = member.properties;
  if (!isObject(properties) || properties.type === undefined) {
    return undefined;
  }

  const literals = new Set<string>();
  const seenRefs = new Set<string>();

  const collect = (typeNode: JsonValue | undefined): void => {
    let node = unwrapTemplate(typeNode);
    if (isObject(node) && typeof node.$ref === 'string') {
      if (seenRefs.has(node.$ref)) {
        return;
      }
      seenRefs.add(node.$ref);
      node = unwrapTemplate(resolveLocalRef(root, node.$ref) ?? node);
    }
    if (!isObject(node)) {
      return;
    }
    if (typeof node.const === 'string') {
      literals.add(node.const);
    }
    if (Array.isArray(node.enum)) {
      for (const value of node.enum) {
        if (typeof value === 'string') {
          literals.add(value);
        }
      }
    }
    for (const key of ['anyOf', 'oneOf', 'allOf'] as const) {
      const branches = node[key];
      if (Array.isArray(branches)) {
        branches.forEach(collect);
      }
    }
  };

  collect(properties.type);
  return literals.size > 0 ? [...literals] : undefined;
};

/**
 * Rewrite a member's `type` to a bare `const` (single literal) or `enum` (several)
 * so ajv's native `discriminator` can read the tag, and ensure `type` is required
 * (ajv requires the discriminator property in every branch).
 */
const normalizeDiscriminatorType = (member: JsonObject, literals: string[]): void => {
  const properties = member.properties as JsonObject;
  const previous = unwrapTemplate(properties.type);
  const description =
    isObject(previous) && typeof previous.description === 'string'
      ? previous.description
      : undefined;

  const typeSchema: JsonObject =
    literals.length === 1
      ? { type: 'string', const: literals[0] }
      : { type: 'string', enum: [...literals] };
  if (description !== undefined) {
    typeSchema.description = description;
  }
  properties.type = typeSchema;

  const required = Array.isArray(member.required)
    ? member.required.filter((entry): entry is string => typeof entry === 'string')
    : [];
  if (!required.includes(DISCRIMINATOR_PROPERTY)) {
    required.push(DISCRIMINATOR_PROPERTY);
  }
  member.required = required;
};

interface MemberPlan {
  /** The concrete object whose `type` will be normalized. */
  readonly target: JsonObject;
  /** Discriminator literal(s) this member maps to. */
  readonly literals: string[];
  /** Reassign the (unwrapped) member back into the union / definition. */
  readonly commit: () => void;
}

/**
 * Resolve a single union member to the concrete object to normalize, and how to
 * reassign it. Members may be a bare object, a template wrapper
 * (`anyOf: [obj, __workflowTemplateValue]`), or a `$ref` to a (possibly wrapped)
 * definition. In every case the committed member is the concrete object so ajv's
 * native discriminator can read `properties.type`. Returns `undefined` when the
 * member has no determinable `type` literal.
 */
const planMember = (
  root: JsonObject,
  members: JsonValue[],
  index: number
): MemberPlan | undefined => {
  const concrete = unwrapTemplate(members[index]);
  if (!isObject(concrete)) {
    return undefined;
  }

  if (typeof concrete.$ref === 'string') {
    const ref = concrete.$ref;
    const container = resolveRefContainer(root, ref);
    const resolved = resolveLocalRef(root, ref);
    if (container === undefined || !isObject(resolved)) {
      return undefined;
    }
    const target = unwrapTemplate(resolved);
    if (!isObject(target)) {
      return undefined;
    }
    const literals = readTypeLiterals(root, target);
    if (literals === undefined) {
      return undefined;
    }
    return {
      target,
      literals,
      commit: () => {
        // Replace the (possibly template-wrapped) definition with the concrete
        // object; keep the member pointing at that same ref.
        container.container[container.key] = target;
        members[index] = { $ref: ref };
      },
    };
  }

  const literals = readTypeLiterals(root, concrete);
  if (literals === undefined) {
    return undefined;
  }
  return {
    target: concrete,
    literals,
    commit: () => {
      members[index] = concrete;
    },
  };
};

/**
 * Add an OpenAPI-style `discriminator` to the union backing `propertyName`, and
 * normalize every branch's `type` to a bare `const`/`enum`. Applied all-or-nothing:
 * if any branch lacks a determinable `type` literal, or two branches would map to
 * the same tag, the union is left untouched (ajv then falls back to a plain
 * `oneOf`/`anyOf` - correct, just slower). Mutates `schema` in place.
 */
const applyDiscriminator = (schema: JsonObject, propertyName: string): void => {
  const union = resolveTopLevelUnion(schema, propertyName);
  if (!isObject(union) || 'discriminator' in union) {
    return;
  }
  const arrayKey = findUnionArrayKey(union);
  if (arrayKey === undefined) {
    return;
  }
  const members = union[arrayKey] as JsonValue[];
  if (members.length === 0) {
    return;
  }

  const plans: MemberPlan[] = [];
  const seenLiterals = new Set<string>();
  for (let index = 0; index < members.length; index++) {
    const plan = planMember(schema, members, index);
    if (plan === undefined) {
      return;
    }
    for (const literal of plan.literals) {
      if (seenLiterals.has(literal)) {
        return;
      }
      seenLiterals.add(literal);
    }
    plans.push(plan);
  }

  for (const plan of plans) {
    normalizeDiscriminatorType(plan.target, plan.literals);
    plan.commit();
  }
  union.discriminator = { propertyName: DISCRIMINATOR_PROPERTY };
};

/**
 * Make the `steps`/`triggers` unions ajv-native-discriminator ready: attach a
 * `discriminator` keyword and collapse each branch's templated `type` back to a
 * bare `const`/`enum`. This trades templating the discriminator itself (a step
 * whose `type` is a `{{ ... }}`/`__install__` placeholder is no longer accepted)
 * for O(#steps) validation and branch-anchored errors. All other value positions
 * keep their template tolerance. Mutates and returns `schema`.
 */
export const addUnionDiscriminators = (schema: JsonObject): JsonObject => {
  for (const propertyName of DISCRIMINATED_PROPERTIES) {
    applyDiscriminator(schema, propertyName);
  }
  return schema;
};
