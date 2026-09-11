import type { Document } from 'yaml';
import type { InvalidYamlSyntaxError } from '../errors';
export declare function getYamlDocumentErrors(document: Document): InvalidYamlSyntaxError[];
