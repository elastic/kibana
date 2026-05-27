import type { CreateIn, UpdateIn, DeleteIn } from '../../common';
export declare const useCreateContentMutation: <I extends CreateIn = CreateIn, O = unknown>() => import("@kbn/react-query").UseMutationResult<O, unknown, I, unknown>;
export declare const useUpdateContentMutation: <I extends UpdateIn = UpdateIn, O = unknown>() => import("@kbn/react-query").UseMutationResult<O, unknown, I, unknown>;
export declare const useDeleteContentMutation: <I extends DeleteIn = DeleteIn, O = unknown>() => import("@kbn/react-query").UseMutationResult<O, unknown, I, unknown>;
