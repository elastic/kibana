import type { Document, Pair, Scalar, YAMLMap } from 'yaml';
/**
 * Finds the triggers pair in the YAML document, even if it's empty or has empty items
 * @returns The triggers pair if found, null otherwise
 */
export declare function getTriggersPair(yamlDocument: Document): Pair | null;
/**
 * Finds all trigger nodes in the YAML document
 * @param yamlDocument The YAML document to search for trigger nodes
 * @returns An array of objects containing the trigger node, trigger type, and type pair
 */
export declare function getTriggerNodes(yamlDocument: Document): Array<{
    node: YAMLMap;
    triggerType: string;
    typePair: Pair<Scalar, Scalar>;
}>;
