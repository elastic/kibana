interface Original {
    name?: string[];
    path?: string[];
}
export interface CodeSignature {
    subject_name: string[];
    trusted: boolean;
}
export interface Token {
    integrity_level_name: string;
}
export interface MemoryPe {
    imphash?: string;
}
export interface StartAddressDetails {
    allocation_base?: number;
    allocation_protection?: string;
    allocation_size?: number;
    allocation_type?: string;
    bytes_address?: number;
    bytes_allocation_offset?: number;
    bytes_compressed?: string;
    bytes_compressed_present?: string;
    mapped_path?: string;
    mapped_pe_detected?: boolean;
    memory_pe_detected?: boolean;
    region_base?: number;
    region_protection?: string;
    region_size?: number;
    region_state?: string;
    strings?: string;
    memory_pe?: MemoryPe;
}
export interface Ext {
    code_signature?: CodeSignature[] | CodeSignature;
    original?: Original;
    token?: Token;
    start_address_allocation_offset?: number;
    start_address_bytes_disasm_hash?: string;
    start_address_details?: StartAddressDetails;
}
export interface Hash {
    md5?: string[];
    sha1?: string[];
    sha256: string[];
    cdhash?: string[];
    sha384?: string[];
    sha512?: string[];
    ssdeep?: string[];
    tlsh?: string[];
}
export interface FileEcs {
    name?: string[];
    path?: string[];
    target_path?: string[];
    extension?: string[];
    Ext?: Ext;
    type?: string[];
    code_signature?: CodeSignature;
    device?: string[];
    inode?: string[];
    uid?: string[];
    owner?: string[];
    gid?: string[];
    group?: string[];
    mode?: string[];
    size?: number[];
    mtime?: string[];
    ctime?: string[];
    hash?: Hash;
}
export {};
