import React from 'react';
interface WelcomeProps {
    urlBasePath: string;
    onSkip: () => void;
}
/**
 * Shows a full-screen welcome page that gives helpful quick links to beginners.
 */
export declare const Welcome: React.FC<WelcomeProps>;
export {};
