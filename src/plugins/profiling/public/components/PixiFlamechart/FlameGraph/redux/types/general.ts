export const TOGGLE_SIDEBAR = 'TOGGLE_SIDEBAR';
export const RESIZE = 'RESIZE';
export const SET_FILTERS = 'SET_FILTERS';

export interface QueryFilter {
  startDate: Date | number | null | undefined
  endDate: Date | number | null | undefined
  text?: string | null | undefined
  limit?: number | string | null
  weight?: number | string | null
  type?: string | null
  traceId?: string | null | undefined
  flamegraphBlock?: string | null | undefined
  isDiff?: boolean | null | undefined
  startDateDiff?: Date | number | null | undefined
  endDateDiff?: Date | number | null | undefined
  textDiff?: string | null
  limitDiff?: number | string | null
  weightDiff?: number | string | null
  isRelative?: boolean | null | undefined
}

export interface General {
  isSidebarCollapsed: boolean
  windowWidth: number
  windowHeight: number
  filters: QueryFilter
}

interface ToggleSidebarAction {
  type: typeof TOGGLE_SIDEBAR
}

interface ResizeAction {
  // There was a bug in the type checking that was causing the following error
  // TODO: please try to remove this when new versions of ts or related deps are updated
  // Type 'string' is not assignable to type '"RESIZE"'.  TS2345
  // type: typeof RESIZE
  type: string
  width: number
  height: number
}

export interface SetFilterAction {
  type: typeof SET_FILTERS
  filters: QueryFilter
}

export type GeneralActionTypes =
  | ToggleSidebarAction
  | ResizeAction
  | SetFilterAction
