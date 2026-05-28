import type { TutorialType } from '../services/tutorials/types';
export declare function getTutorials(): Promise<TutorialType[]>;
export declare function getTutorial(id: string): Promise<TutorialType>;
