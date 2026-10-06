import React from 'react';
import type { ICPSManager } from '../types';
interface ProjectPickerContainerProps {
    cpsManager: ICPSManager;
}
/**
 * Container component that connects ProjectPicker to CPSManager.
 * Delegates to ActiveProjectPicker or DisabledProjectPicker based on access level,
 * so the fetch hook only runs when the picker is actually active.
 */
export declare const ProjectPickerContainer: React.FC<ProjectPickerContainerProps>;
export {};
