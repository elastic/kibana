import React, { type PropsWithChildren, type RefObject, type MutableRefObject } from 'react';
import type { TimeRangeBounds, TimeRangeBoundsOption, TimeRange, InitialFocus, CalendarOptions, DateRangePickerSettings } from './types';
import type { DateRangePickerProps } from './date_range_picker';
import type { TimeWindowButtonsConfig } from './date_range_picker_time_window_buttons';
/** Public context value exposed to consumers via `useDateRangePickerContext`. */
export interface DateRangePickerContextValue {
    /** Current input text */
    text: string;
    /** Whether the current input is invalid */
    isInvalid: boolean;
    /** Update the input text */
    setText: (value: string) => void;
    /**
     * Apply the current text (or an explicit range) as the selected time range.
     * When called with a `TimeRangeBounds`, sets text to that range; otherwise applies current text.
     * Pass an optional `textOverride` to control the input value instead of generating it from the bounds.
     * Calls parent `onChange` and exits editing mode.
     */
    applyRange: (range?: TimeRangeBounds, textOverride?: string) => void;
}
/** Internal context value used by sub-components. */
interface DateRangePickerInternalContextValue extends DateRangePickerContextValue {
    /** Whether the picker is in editing mode (input focused, panel open) or idle. */
    isEditing: boolean;
    /** Toggle editing mode; restores previous text when exiting without applying. */
    setIsEditing: (value: boolean) => void;
    /** Whether to use EUI compressed form styling. */
    compressed: boolean;
    /** Controls whether the idle-state control collapses its text label. */
    collapsed: boolean;
    /** Predefined time range options shown in the Presets section. */
    presets: TimeRangeBoundsOption[];
    /** Recently used time ranges shown in the Recent section. */
    recent: TimeRangeBoundsOption[];
    /** Human-readable display text for the current time range (shown when idle). */
    displayText: string;
    /** Full formatted text including absolute dates, used for tooltips. */
    displayFullFormattedText: string;
    /** Short duration label (e.g., "15m"), or `null` if duration cannot be computed. */
    displayShortDuration: string | null;
    /** Ref to the text input element for focus management. */
    inputRef: RefObject<HTMLInputElement>;
    /** Ref to the trigger button for focus restoration. */
    buttonRef: RefObject<HTMLButtonElement>;
    /** Ref to the popover panel for click-outside detection. */
    panelRef: MutableRefObject<HTMLElement | null>;
    /** Generated HTML id for the dialog panel, used for ARIA `aria-controls`. */
    panelId: string;
    /** Optional initial focus target for the dialog panel. */
    initialFocus?: InitialFocus;
    /** Parsed time range derived from the current text input. */
    timeRange: TimeRange;
    /** Resolved time window buttons config, or `false` when disabled. */
    timeWindowButtonsConfig: TimeWindowButtonsConfig | false;
    /** Called when the user wants to save the current input time range as a preset. */
    onPresetSave?: (option: TimeRangeBoundsOption) => void;
    /** Called when the user wants to delete a saved preset. */
    onPresetDelete?: (option: TimeRangeBoundsOption) => void;
    /**
     * Called when the editing input text changes.
     * @beta
     */
    onInputChange?: (value: string) => void;
    /** Horizontal sizing behavior of the picker. */
    width: NonNullable<DateRangePickerProps['width']>;
    /** Whether the picker is disabled. */
    disabled: boolean;
    /** Whether a loading spinner is shown inside the form control. */
    isLoading: boolean;
    /** Calendar-specific options (e.g. first day of week). */
    calendarOptions?: CalendarOptions;
    /** Current picker settings (e.g. rounding, refresh). */
    settings: DateRangePickerSettings;
    /** Called when the user changes a setting in the settings panel. */
    onSettingsChange: (settings: DateRangePickerSettings) => void;
    /**
     * A valid time zone name from the IANA database, e.g. "America/Los_Angeles".
     * Displayed informally in the panel footer.
     */
    timeZone?: string;
    /** Seconds until the next auto-refresh. While paused, this value is frozen at the last countdown value. `null` when auto-refresh is disabled or the interval is invalid. */
    autoRefreshSecondsRemaining: number | null;
    /** Toggles `settings.autoRefresh.isPaused` (play/pause on the input append). No-op when `settings.autoRefresh` is not set. */
    toggleAutoRefresh: () => void;
    /** Whether an `onRefresh` callback was provided; used to gate auto-refresh UI without exposing the function. */
    hasAutoRefresh: boolean;
    /** Prepends the Kibana server basePath to a URL path. Identity function when not provided. */
    prependBasePath: (path: string) => string;
    /** Whether the current user can access the Advanced Settings management page. */
    canAccessAdvancedSettings: boolean;
}
/**
 * Hook to access the DateRangePicker context.
 * Must be used within a `DateRangePickerProvider`.
 */
export declare function useDateRangePickerContext(): DateRangePickerInternalContextValue;
/**
 * Provider component that owns all DateRangePicker state.
 */
export declare function DateRangePickerProvider({ children, value, defaultValue, onChange, dateFormat, isInvalid, disabled, isLoading, compressed, collapsed, showTimeWindowButtons, presets, recent, onPresetSave, onPresetDelete, onInputChange, width, calendarOptions, settings, onSettingsChange, timeZone, onRefresh, refreshEpoch, prependBasePath: prependBasePathProp, canAccessAdvancedSettings, }: PropsWithChildren<DateRangePickerProps>): React.JSX.Element;
export {};
