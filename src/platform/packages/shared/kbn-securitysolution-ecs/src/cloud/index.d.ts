export interface CloudEcs {
    instance?: CloudInstanceEcs;
    machine?: CloudMachineEcs;
    provider?: string[];
    region?: string[];
}
export interface CloudMachineEcs {
    type?: string[];
}
export interface CloudInstanceEcs {
    id?: string[];
}
