import type { Observable } from 'rxjs';
import type { ICPSManager } from '../types';
import { ProjectRoutingAccess } from '../types';
interface ApplicationService {
    currentAppId$: Observable<string | undefined>;
}
interface CpsService {
    cpsManager?: ICPSManager;
}
export declare const useRouteBasedCpsPickerAccess: (access: ProjectRoutingAccess, { application, cps }: {
    application: ApplicationService;
    cps?: CpsService;
}) => void;
export {};
