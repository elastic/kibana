/**
 * TODO: Once this tour is removed, update the test to no longer dismiss it.
 * See {@link ThreatMatchRuleCreatePage.dismissCpsTourIfPresent}.
 */
export declare const TOUR_STORAGE_KEY = "cps:projectPicker:tourShown";
export declare const useProjectPickerTour: () => {
    isTourOpen: boolean;
    closeTour: () => void;
};
