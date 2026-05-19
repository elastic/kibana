import type { FeedbackRegistryEntry } from '../types';
interface UseQuestionsForAppArgs {
    getQuestions: (appId: string) => Promise<FeedbackRegistryEntry[]>;
    appId: string;
}
interface UseQuestionsForAppResult {
    questions: FeedbackRegistryEntry[];
    isLoading: boolean;
    error: Error | undefined;
}
export declare const useQuestionsForApp: ({ getQuestions, appId, }: UseQuestionsForAppArgs) => UseQuestionsForAppResult;
export {};
