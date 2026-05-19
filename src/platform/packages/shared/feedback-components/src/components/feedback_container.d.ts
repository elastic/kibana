import React from 'react';
import type { FeedbackFormData, FeedbackRegistryEntry } from '../types';
interface Props {
    getQuestions: (appId: string) => Promise<FeedbackRegistryEntry[]>;
    getAppDetails: () => {
        title: string;
        id: string;
        url: string;
    };
    getCurrentUserEmail: () => Promise<string | undefined>;
    sendFeedback: (data: FeedbackFormData) => Promise<void>;
    showToast: (title: string, type: 'success' | 'error') => void;
    hideFeedbackContainer: () => void;
}
export declare const FeedbackContainer: ({ getQuestions, getAppDetails, getCurrentUserEmail, sendFeedback, showToast, hideFeedbackContainer, }: Props) => React.JSX.Element;
export {};
