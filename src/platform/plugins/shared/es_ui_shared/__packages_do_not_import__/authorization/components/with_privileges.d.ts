import type { MissingPrivileges } from '../types';
type Privileges = string | string[];
interface Props {
    /**
     * Each required privilege must have the format "section.privilege".
     * To indicate that *all* privileges from a section are required, we can use the asterix
     * e.g. "index.*"
     */
    privileges: Privileges;
    children: (childrenProps: {
        isLoading: boolean;
        hasPrivileges: boolean;
        privilegesMissing: MissingPrivileges;
    }) => JSX.Element | null;
}
type Privilege = [string, string];
export declare const convertPrivilegesToArray: (privileges: Privileges) => Privilege[];
export declare const WithPrivileges: ({ privileges: requiredPrivileges, children }: Props) => JSX.Element | null;
export {};
