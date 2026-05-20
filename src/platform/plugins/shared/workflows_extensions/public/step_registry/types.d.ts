import type { EditorHandlers } from '@kbn/workflows/types/latest';
import type { z } from '@kbn/zod/v4';
import type { CommonStepDefinition } from '../../common';
/**
 * Helper function to create a PublicStepDefinition with automatic type inference.
 * This ensures that the editorHandlers' types are correctly inferred
 * from the inputSchema and configSchema without needing explicit type annotations.
 *
 **/
export declare function createPublicStepDefinition<Input extends z.ZodType = z.ZodType, Output extends z.ZodType = z.ZodType, Config extends z.ZodObject = z.ZodObject>(definition: PublicStepDefinition<Input, Output, Config>): PublicStepDefinition<Input, Output, Config>;
/**
 * User-facing metadata for a workflow step.
 * This is used by the UI to display step information (label, description, icon, schemas, documentation).
 */
export interface PublicStepDefinition<Input extends z.ZodType = z.ZodType, Output extends z.ZodType = z.ZodType, Config extends z.ZodObject = z.ZodObject> extends CommonStepDefinition<Input, Output, Config> {
    /**
     * Icon type from EUI icon library.
     * Used to visually represent this step type in the UI.
     * kibana icon will be used if not provided
     * TODO: add support for EuiIconType
     */
    icon?: React.ComponentType;
    /**
     * Property handlers for the step.
     */
    editorHandlers?: EditorHandlers<Input, Output, Config>;
}
