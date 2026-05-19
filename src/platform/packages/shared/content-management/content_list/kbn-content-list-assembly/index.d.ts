/**
 * Content List Assembly
 *
 * Typed factory for defining declarative component assemblies.
 *
 * Three layers: Assembly -> Part -> Preset. Each is named, and
 * TypeScript constrains the types at every layer.
 */
export { defineAssembly, type AssemblyFactory, type PartFactory } from './src/assembly';
export { type ParsedPart, type ParsedChild, type ParsedItem } from './src/parsing';
export type { DeclarativeComponent, DeclarativeReturn } from './src/types';
export { isCustomSkeletonNode } from './src/skeleton';
export type { SkeletonDescriptor, SkeletonOutput, SkeletonTextLines } from './src/skeleton';
