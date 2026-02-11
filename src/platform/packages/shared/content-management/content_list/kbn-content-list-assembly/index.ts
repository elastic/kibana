/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Content List Assembly
 *
 * Typed factory for defining declarative component assemblies.
 *
 * Three layers: Assembly -> Part -> Preset. Each is named, and
 * TypeScript constrains the types at every layer.
 */

// Assembly factory -- primary API.
export { defineAssembly, type AssemblyFactory, type PartFactory } from './src/assembly';

// Parse result types.
export { type ParsedPart, type ParsedChild, type ParsedItem } from './src/parsing';

// Helper types for defining declarative components.
export type { DeclarativeComponent, DeclarativeReturn } from './src/types';
