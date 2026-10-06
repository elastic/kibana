import { z } from '@kbn/zod/v4';
/**
 * The contract an **action workflow** satisfies. Lives here rather than in a
 * consuming plugin because the action YAML files live here, so the definitions
 * and the schema they are checked against cannot drift apart.
 *
 * An action workflow is an ordinary managed workflow that a human approves
 * before it runs. It:
 *
 * 1. carries {@link ACTION_WORKFLOW_TAG}, so the catalog is discoverable by tag
 *    rather than from a hardcoded list;
 * 2. declares {@link actionMetadataSchema} under `consts.actionMetadata`, because
 *    unknown top-level YAML keys are stripped by the workflow schema;
 * 3. takes a single {@link ACTION_WORKFLOW_INPUT} object, so a generic gate never
 *    needs to know an action's parameter names;
 * 4. ends in a `workflow.output` step, because `workflow.execute` cannot type a
 *    child's result.
 */
export declare const ACTION_WORKFLOW_TAG: 'action';
/** The single input every action workflow accepts. */
export declare const ACTION_WORKFLOW_INPUT: 'actionInput';
/**
 * Grouping axis for the decision queue an approved action feeds. Deliberately
 * an arbitrary keyword rather than an enum: each solution owns the vocabulary
 * its own actions and queries use, and AlertZero's set is not NightShift's.
 * Consumers group and aggregate on it — nothing sorts on it, and the display
 * order of categories is a UI concern rather than something stored.
 */
export declare const actionCategorySchema: z.ZodString;
export type ActionCategory = z.infer<typeof actionCategorySchema>;
/** How consequential running the action is. Intrinsic to the action, not the situation. */
export declare const actionImpactSchema: z.ZodEnum<{
    critical: "critical";
    high: "high";
    low: "low";
    medium: "medium";
}>;
export type ActionImpact = z.infer<typeof actionImpactSchema>;
/**
 * `always-gate` actions must never be auto-approved, whatever a caller's
 * autonomy policy resolves to.
 */
export declare const actionApprovalPolicySchema: z.ZodEnum<{
    "always-gate": "always-gate";
    "autonomy-dependent": "autonomy-dependent";
}>;
export type ActionApprovalPolicy = z.infer<typeof actionApprovalPolicySchema>;
/** Self-description an action workflow declares under `consts.actionMetadata`. */
export declare const actionMetadataSchema: z.ZodObject<{
    name: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    category: z.ZodOptional<z.ZodString>;
    impact: z.ZodOptional<z.ZodEnum<{
        critical: "critical";
        high: "high";
        low: "low";
        medium: "medium";
    }>>;
    reversible: z.ZodOptional<z.ZodBoolean>;
    approvalPolicy: z.ZodOptional<z.ZodEnum<{
        "always-gate": "always-gate";
        "autonomy-dependent": "autonomy-dependent";
    }>>;
}, z.core.$strip>;
export type ActionMetadata = z.infer<typeof actionMetadataSchema>;
