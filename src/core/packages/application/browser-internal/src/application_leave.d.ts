import { type AppLeaveAction, type AppLeaveConfirmAction, type AppLeaveHandler } from '@kbn/core-application-browser';
export declare function isConfirmAction(action: AppLeaveAction): action is AppLeaveConfirmAction;
export declare function getLeaveAction(handler?: AppLeaveHandler, nextAppId?: string): AppLeaveAction;
