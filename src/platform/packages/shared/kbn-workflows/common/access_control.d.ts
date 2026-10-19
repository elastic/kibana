import type { AccessControl, EntityAccessDecision } from '@kbn/entity-access-control';
import { z } from '@kbn/zod/v4';
export declare const WORKFLOW_ACCESS_CONTROL_ROLES: readonly ['viewer', 'executor', 'editor'];
export type WorkflowAccessControlRole = (typeof WORKFLOW_ACCESS_CONTROL_ROLES)[number];
export type WorkflowAccessControl = AccessControl<WorkflowAccessControlRole>;
export declare const workflowAccessControlSchema: z.ZodObject<{
    access_mode: z.ZodEnum<{
        private: "private";
        public: "public";
    }>;
    entries: z.ZodDefault<z.ZodArray<z.ZodObject<{
        type: z.ZodLiteral<"user">;
        id: z.ZodString;
        role: z.ZodEnum<{
            editor: "editor";
            executor: "executor";
            viewer: "viewer";
        }>;
    }, z.core.$strip>>>;
}, z.core.$strip>;
export declare const storedWorkflowAccessControlSchema: z.ZodOptional<z.ZodObject<{
    access_mode: z.ZodEnum<{
        private: "private";
        public: "public";
    }>;
    entries: z.ZodArray<z.ZodObject<{
        type: z.ZodLiteral<"user">;
        id: z.ZodString;
        role: z.ZodEnum<{
            editor: "editor";
            executor: "executor";
            viewer: "viewer";
        }>;
        added_at: z.ZodString;
    }, z.core.$strip>>;
}, z.core.$strip>>;
export type WorkflowAccessOperation = 'read' | 'execute' | 'edit' | 'manage';
export type WorkflowPermissions = Record<WorkflowAccessOperation, boolean>;
export interface WorkflowAccessSubject {
    access_control?: WorkflowAccessControl;
    owner_id?: string;
}
/** Resolves workflow ACL decisions independently of feature privileges. */
export declare const getWorkflowAccessDecisions: (workflow: WorkflowAccessSubject, profileId: string | undefined, isAdmin?: boolean) => Record<WorkflowAccessOperation, EntityAccessDecision>;
/** Resolves workflow ACL permissions independently of feature privileges. */
export declare const getWorkflowPermissions: (workflow: WorkflowAccessSubject, profileId: string | undefined, isAdmin?: boolean) => WorkflowPermissions;
export declare const toWorkflowPermissions: (decisions: Record<WorkflowAccessOperation, EntityAccessDecision>) => WorkflowPermissions;
