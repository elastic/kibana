import type { CollapsibleSection, GridSectionData, MainSection } from '../grid_section';
import type { OrderedLayout } from '../types';
/**
 * Move the panels in the `startingSection` to the bottom of the `newSection` and resolve the resulting panels
 * @param startingSectionPanels The source section for the panels
 * @param newSectionPanels The destination section for the panels
 * @returns Combined panel list
 */
export declare const combinePanels: (startingSectionPanels: GridSectionData["panels"], newSectionPanels: GridSectionData["panels"]) => GridSectionData["panels"];
/**
 * Deletes an entire section from the layout, including all of its panels
 * @param layout Starting layout
 * @param sectionId The section to be deleted
 * @returns Updated layout with the section at `sectionId` deleted and orders adjusted
 */
export declare const deleteSection: (layout: OrderedLayout, sectionId: string) => OrderedLayout;
/**
 * Combine sequential main layouts and redefine section orders to keep layout consistent + valid
 * @param layout Starting layout
 * @returns Updated layout with `main` sections combined + section orders resolved
 */
export declare const resolveSections: (layout: OrderedLayout) => OrderedLayout;
export declare const isCollapsibleSection: (section: CollapsibleSection | MainSection) => section is CollapsibleSection;
