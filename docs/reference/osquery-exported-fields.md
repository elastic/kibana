---
mapped_pages:
  - https://www.elastic.co/guide/en/kibana/current/exported-fields-osquery.html
---

# Osquery exported fields [exported-fields-osquery]

The following fields can be returned in osquery results. Note the following about osquery fields:

* Some fields list multiple descriptions because the one that applies depends on which table was queried. For example, a result stored in the `osquery.autoupdate` field may represent a response from the `firefox_addons` table or the `windows_security_center` table.
* In the cases where a field name is associated with more than one osquery table, we have made a best guess at what the data `type` should be. In the cases where it is unknown, the data type is set as a `keyword` object.

For more information about osquery tables, see the [osquery schema documentation](https://osquery.io/schema).


## Fields [osquery-fields]

**UUID** - keyword, text.text

* *system_extensions.UUID* - Extension unique id

**access** - keyword, text.text

* *ntfs_acl_permissions.access* - Specific permissions that indicate the rights described by the ACE.

**accessed_directories** - keyword, text.text

* *prefetch.accessed_directories* - Directories accessed by application within ten seconds of launch.

**accessed_directories_count** - keyword, number.long

* *prefetch.accessed_directories_count* - Number of directories accessed.

**accessed_files** - keyword, text.text

* *prefetch.accessed_files* - Files accessed by application within ten seconds of launch.

**accessed_files_count** - keyword, number.long

* *prefetch.accessed_files_count* - Number of files accessed.

**accessed_time** - keyword, number.long

* *shellbags.accessed_time* - Directory Accessed time.

**account** - keyword, text.text

* *keychain_items.account* - Optional item account

**account_id** - keyword, text.text

* *ec2_instance_metadata.account_id* - AWS account ID which owns this EC2 instance

**action** - keyword, text.text

* *disk_events.action* - Appear or disappear
* *file_events.action* - Change action (UPDATE, REMOVE, etc)
* *hardware_events.action* - Remove, insert, change properties, etc
* *ntfs_journal_events.action* - Change action (Write, Delete, etc)
* *scheduled_tasks.action* - Actions executed by the scheduled task
* *socket_events.action* - The socket action (bind, connect, accept)
* *windows_firewall_rules.action* - Action for the rule or default setting
* *yara_events.action* - Change action (UPDATE, REMOVE, etc)

**activated** - keyword, number.long

* *tpm_info.activated* - TPM is activated

**active** - keyword, number.long

* *firefox_addons.active* - 1 If the addon is active else 0
* *memory_info.active* - The total amount of buffer or page cache memory, in bytes, that is in active use
* *osquery_events.active* - 1 if the publisher or subscriber is active else 0
* *osquery_packs.active* - Whether this pack is active (the version, platform and discovery queries match) yes=1, no=0.
* *osquery_registry.active* - 1 If this plugin is active else 0
* *virtual_memory_info.active* - Total number of active pages.

**active_disks** - keyword, number.long

* *md_devices.active_disks* - Number of active disks in array

**active_state** - keyword, text.text

* *systemd_units.active_state* - The high-level unit activation state, i.e. generalization of SUB

**activity** - keyword, number.long

* *unified_log.activity* - the activity ID associate with the entry

**actual** - keyword, number.long

* *fan_speed_sensors.actual* - Actual speed

**add_reason** - keyword, text.text

* *wifi_networks.add_reason* - Shows why this network was added, via menubar or command line or something else

**added_at** - keyword, number.long

* *wifi_networks.added_at* - Time this network was added as a unix_time

**additional_properties** - keyword, text.text

* *windows_search.additional_properties* - Comma separated list of columns to include in properties JSON

**address** - keyword, text.text

* *arp_cache.address* - IPv4 address target
* *dns_resolvers.address* - Resolver IP/IPv6 address
* *etc_hosts.address* - IP address mapping
* *interface_addresses.address* - Specific address for interface
* *kernel_modules.address* - Kernel module address
* *listening_ports.address* - Specific address for bind
* *platform_info.address* - Relative address of firmware mapping
* *user_events.address* - The Internet protocol address or family ID

**address_width** - keyword, text.text

* *cpu_info.address_width* - The width of the CPU address bus.

**admindir** - keyword, text.text

* *deb_packages.admindir* - libdpkg admindir. Defaults to /var/lib/dpkg

**algorithm** - keyword, text.text

* *authorized_keys.algorithm* - Key type

**alias** - keyword, text.text

* *etc_protocols.alias* - Protocol alias
* *time_machine_destinations.alias* - Human readable name of drive

**aliases** - keyword, text.text

* *etc_services.aliases* - Optional space separated list of other names for a service
* *lxd_images.aliases* - Comma-separated list of image aliases

**allow_maximum** - keyword, number.long

* *shared_resources.allow_maximum* - Number of concurrent users for this resource has been limited. If True, the value in the MaximumAllowed property is ignored.

**allow_root** - keyword, text.text

* *authorizations.allow_root* - Label top-level key

**allow_signed_enabled** - keyword, number.long

* *alf.allow_signed_enabled* - 1 If allow signed mode is enabled else 0 (not supported on macOS 15+)

**ambient_brightness_enabled** - keyword, text.text

* *connected_displays.ambient_brightness_enabled* - The ambient brightness setting associated with the display. This will be 1 if enabled and is 0 if disabled or not supported.

**ami_id** - keyword, text.text

* *ec2_instance_metadata.ami_id* - AMI ID used to launch this EC2 instance

**amperage** - keyword, number.long

* *battery.amperage* - The current amperage in/out of the battery in mA (positive means charging, negative means discharging)

**anonymous** - keyword, number.long

* *virtual_memory_info.anonymous* - Total number of anonymous pages.

**antispyware** - keyword, text.text

* *windows_security_center.antispyware* - Deprecated (always 'Good').

**antivirus** - keyword, text.text

* *windows_security_center.antivirus* - The health of the monitored Antivirus solution (see windows_security_products)

**api_version** - keyword, text.text

* *docker_version.api_version* - API version

**app_name** - keyword, text.text

* *windows_firewall_rules.app_name* - Friendly name of the application to which the rule applies

**apparmor** - keyword, text.text

* *apparmor_events.apparmor* - Apparmor Status like ALLOWED, DENIED etc.

**applescript_enabled** - keyword, text.text

* *apps.applescript_enabled* - Info properties NSAppleScriptEnabled label

**application** - keyword, text.text

* *office_mru.application* - Associated Office application

**arch** - keyword, text.text

* *deb_packages.arch* - Package architecture
* *docker_version.arch* - Hardware architecture
* *os_version.arch* - OS Architecture
* *rpm_packages.arch* - Architecture(s) supported
* *seccomp_events.arch* - Information about the CPU architecture
* *signature.arch* - If applicable, the arch of the signed code

**architecture** - keyword, text.text

* *docker_info.architecture* - Hardware architecture
* *ec2_instance_metadata.architecture* - Hardware architecture of this EC2 instance
* *lxd_images.architecture* - Target architecture for the image
* *lxd_instances.architecture* - Instance architecture

**architectures** - keyword, text.text

* *apt_sources.architectures* - Repository architectures

**args** - keyword, text.text

* *startup_items.args* - Arguments provided to startup executable

**arguments** - keyword, text.text

* *kernel_info.arguments* - Kernel arguments

**array_handle** - keyword, text.text

* *memory_devices.array_handle* - The memory array that the device is attached to

**assessments_enabled** - keyword, number.long

* *gatekeeper.assessments_enabled* - 1 If a Gatekeeper is enabled else 0

**asset_tag** - keyword, text.text

* *memory_devices.asset_tag* - Manufacturer specific asset tag of memory device

**atime** - keyword, number.long

* *device_file.atime* - Last access time
* *file.atime* - Last access time
* *file_events.atime* - Last access time
* *process_events.atime* - File last access in UNIX time
* *shared_memory.atime* - Attached time

**attach** - keyword, text.text

* *apparmor_profiles.attach* - Which executable(s) a profile will attach to.

**attached** - keyword, number.long

* *shared_memory.attached* - Number of attached processes

**attributes** - keyword, text.text

* *file.attributes* - File attrib string. See: [https://ss64.com/nt/attrib.html](https://ss64.com/nt/attrib.html)

**audible_alarm** - keyword, text.text

* *chassis_info.audible_alarm* - If TRUE, the frame is equipped with an audible alarm.

**audit_account_logon** - keyword, number.long

* *security_profile_info.audit_account_logon* - Determines whether the operating system MUST audit each time this computer validates the credentials of an account

**audit_account_manage** - keyword, number.long

* *security_profile_info.audit_account_manage* - Determines whether the operating system MUST audit each event of account management on a computer

**audit_ds_access** - keyword, number.long

* *security_profile_info.audit_ds_access* - Determines whether the operating system MUST audit each instance of user attempts to access an Active Directory object that has its own system access control list (SACL) specified

**audit_logon_events** - keyword, number.long

* *security_profile_info.audit_logon_events* - Determines whether the operating system MUST audit each instance of a user attempt to log on or log off this computer

**audit_object_access** - keyword, number.long

* *security_profile_info.audit_object_access* - Determines whether the operating system MUST audit each instance of user attempts to access a non-Active Directory object that has its own SACL specified

**audit_policy_change** - keyword, number.long

* *security_profile_info.audit_policy_change* - Determines whether the operating system MUST audit each instance of user attempts to change user rights assignment policy, audit policy, account policy, or trust policy

**audit_privilege_use** - keyword, number.long

* *security_profile_info.audit_privilege_use* - Determines whether the operating system MUST audit each instance of user attempts to exercise a user right

**audit_process_tracking** - keyword, number.long

* *security_profile_info.audit_process_tracking* - Determines whether the operating system MUST audit process-related events

**audit_system_events** - keyword, number.long

* *security_profile_info.audit_system_events* - Determines whether the operating system MUST audit System Change, System Startup, System Shutdown, Authentication Component Load, and Loss or Excess of Security events

**auid** - keyword

* *process_events.auid* - Audit User ID at process start
* *process_file_events.auid* - Audit user ID of the process using the file
* *seccomp_events.auid* - Audit user ID (loginuid) of the user who started the analyzed process
* *socket_events.auid* - Audit User ID
* *user_events.auid* - Audit User ID

**authenticate_user** - keyword, text.text

* *authorizations.authenticate_user* - Label top-level key

**authentication_package** - keyword, text.text

* *logon_sessions.authentication_package* - The authentication package used to authenticate the owner of the logon session.

**author** - keyword, text.text

* *chocolatey_packages.author* - Optional package author
* *chrome_extensions.author* - Optional extension author
* *npm_packages.author* - Package-supplied author
* *python_packages.author* - Optional package author

**authority** - keyword, text.text

* *signature.authority* - Certificate Common Name

**authority_key_id** - keyword, text.text

* *certificates.authority_key_id* - AKID an optionally included SHA1

**authority_key_identifier** - keyword, text.text

* *curl_certificate.authority_key_identifier* - Authority Key Identifier

**authorizations** - keyword, text.text

* *keychain_acls.authorizations* - A space delimited set of authorization attributes

**auto_join** - keyword, number.long

* *wifi_networks.auto_join* - 1 if this network set to join automatically, 0 otherwise

**auto_login** - keyword, number.long

* *wifi_networks.auto_login* - 1 if auto login is enabled, 0 otherwise

**auto_update** - keyword, number.long

* *lxd_images.auto_update* - Whether the image auto-updates (1) or not (0)

**autoupdate** - keyword

* *firefox_addons.autoupdate* - 1 If the addon applies background updates else 0
* *windows_security_center.autoupdate* - The health of the Windows Autoupdate feature

**availability** - keyword, text.text

* *cpu_info.availability* - The availability and status of the CPU.

**availability_zone** - keyword, text.text

* *ec2_instance_metadata.availability_zone* - Availability zone in which this instance launched

**average** - keyword, text.text

* *load_average.average* - Load average over the specified period.

**average_memory** - keyword, number.long

* *osquery_schedule.average_memory* - Average of the bytes of resident memory left allocated after collecting results

**avg_disk_bytes_per_read** - keyword, number.long

* *physical_disk_performance.avg_disk_bytes_per_read* - Average number of bytes transferred from the disk during read operations

**avg_disk_bytes_per_write** - keyword, number.long

* *physical_disk_performance.avg_disk_bytes_per_write* - Average number of bytes transferred to the disk during write operations

**avg_disk_read_queue_length** - keyword, number.long

* *physical_disk_performance.avg_disk_read_queue_length* - Average number of read requests that were queued for the selected disk during the sample interval

**avg_disk_sec_per_read** - keyword, number.long

* *physical_disk_performance.avg_disk_sec_per_read* - Average time, in seconds, of a read operation of data from the disk

**avg_disk_sec_per_write** - keyword, number.long

* *physical_disk_performance.avg_disk_sec_per_write* - Average time, in seconds, of a write operation of data to the disk

**avg_disk_write_queue_length** - keyword, number.long

* *physical_disk_performance.avg_disk_write_queue_length* - Average number of write requests that were queued for the selected disk during the sample interval

**backup_date** - keyword, number.long

* *time_machine_backups.backup_date* - Backup Date

**bank_locator** - keyword, text.text

* *memory_devices.bank_locator* - String number of the string that identifies the physically-labeled bank where the memory device is located

**base64** - keyword, number.long

* *extended_attributes.base64* - 1 if the value is base64 encoded else 0

**base_image** - keyword, text.text

* *lxd_instances.base_image* - ID of image used to launch this instance

**base_uri** - keyword, text.text

* *apt_sources.base_uri* - Repository base URI

**baseurl** - keyword, text.text

* *yum_sources.baseurl* - Repository base URL

**basic_constraint** - keyword, text.text

* *curl_certificate.basic_constraint* - Basic Constraints

**binary_queue** - keyword, number.long

* *carbon_black_info.binary_queue* - Size in bytes of binaries waiting to be sent to Carbon Black server

**bitmap_chunk_size** - keyword, text.text

* *md_devices.bitmap_chunk_size* - Bitmap chunk size

**bitmap_external_file** - keyword, text.text

* *md_devices.bitmap_external_file* - External referenced bitmap file

**bitmap_on_mem** - keyword, text.text

* *md_devices.bitmap_on_mem* - Pages allocated in in-memory bitmap, if enabled

**block** - keyword, text.text

* *ssh_configs.block* - The host or match block

**block_size** - keyword, number.long

* *block_devices.block_size* - Block size in bytes
* *device_file.block_size* - Block size of filesystem
* *file.block_size* - Block size of filesystem

**blocks** - keyword, number.long

* *device_partitions.blocks* - Number of blocks
* *mounts.blocks* - Mounted device used blocks

**blocks_available** - keyword, number.long

* *mounts.blocks_available* - Mounted device available blocks

**blocks_free** - keyword, number.long

* *mounts.blocks_free* - Mounted device free blocks

**blocks_size** - keyword, number.long

* *device_partitions.blocks_size* - Byte size of each block
* *mounts.blocks_size* - Block size in bytes

**bluetooth_sharing** - keyword, number.long

* *sharing_preferences.bluetooth_sharing* - 1 If bluetooth sharing is enabled for any user else 0

**board_model** - keyword, text.text

* *system_info.board_model* - Board model

**board_serial** - keyword, text.text

* *system_info.board_serial* - Board serial number

**board_vendor** - keyword, text.text

* *system_info.board_vendor* - Board vendor

**board_version** - keyword, text.text

* *system_info.board_version* - Board version

**boot_partition** - keyword, number.long

* *logical_drives.boot_partition* - True if Windows booted from this drive.

**boot_uuid** - keyword, text.text

* *ibridge_info.boot_uuid* - Boot UUID of the iBridge controller

**bp_microcode_disabled** - keyword, number.long

* *kva_speculative_info.bp_microcode_disabled* - Branch Predictions are disabled due to lack of microcode update.

**bp_mitigations** - keyword, number.long

* *kva_speculative_info.bp_mitigations* - Branch Prediction mitigations are enabled.

**bp_system_pol_disabled** - keyword, number.long

* *kva_speculative_info.bp_system_pol_disabled* - Branch Predictions are disabled via system policy.

**breach_description** - keyword, text.text

* *chassis_info.breach_description* - If provided, gives a more detailed description of a detected security breach.

**bridge_nf_ip6tables** - keyword, number.long

* *docker_info.bridge_nf_ip6tables* - 1 if bridge netfilter ip6tables is enabled. 0 otherwise

**bridge_nf_iptables** - keyword, number.long

* *docker_info.bridge_nf_iptables* - 1 if bridge netfilter iptables is enabled. 0 otherwise

**broadcast** - keyword, text.text

* *interface_addresses.broadcast* - Broadcast address for the interface

**browser_type** - keyword, text.text

* *chrome_extension_content_scripts.browser_type* - The browser type (Valid values: chrome, chromium, opera, yandex, brave)
* *chrome_extensions.browser_type* - The browser type (Valid values: chrome, chromium, opera, yandex, brave, edge, edge_beta)

**bsd_flags** - keyword, text.text

* *file.bsd_flags* - The BSD file flags (chflags). Possible values: NODUMP, UF_IMMUTABLE, UF_APPEND, OPAQUE, HIDDEN, ARCHIVED, SF_IMMUTABLE, SF_APPEND

**bssid** - keyword, text.text

* *wifi_status.bssid* - The current basic service set identifier
* *wifi_survey.bssid* - The current basic service set identifier

**btime** - keyword, number.long

* *file.btime* - (B)irth or (cr)eate time
* *process_events.btime* - File creation in UNIX time

**buffers** - keyword, number.long

* *memory_info.buffers* - The amount of physical RAM, in bytes, used for file buffers

**build** - keyword, text.text

* *os_version.build* - Optional build-specific or variant string

**build_distro** - keyword, text.text

* *osquery_info.build_distro* - osquery toolkit platform distribution name (os version)

**build_id** - keyword, text.text

* *sandboxes.build_id* - Sandbox-specific identifier

**build_number** - keyword, number.long

* *windows_crashes.build_number* - Windows build number of the crashing machine

**build_platform** - keyword, text.text

* *osquery_info.build_platform* - osquery toolkit build platform

**build_time** - keyword, text.text

* *docker_version.build_time* - Build time
* *portage_packages.build_time* - Unix time when package was built

**bundle_executable** - keyword, text.text

* *apps.bundle_executable* - Info properties CFBundleExecutable label

**bundle_identifier** - keyword, text.text

* *apps.bundle_identifier* - Info properties CFBundleIdentifier label
* *running_apps.bundle_identifier* - The bundle identifier of the application

**bundle_name** - keyword, text.text

* *apps.bundle_name* - Info properties CFBundleName label

**bundle_package_type** - keyword, text.text

* *apps.bundle_package_type* - Info properties CFBundlePackageType label

**bundle_path** - keyword, text.text

* *sandboxes.bundle_path* - Application bundle used by the sandbox
* *system_extensions.bundle_path* - System extension bundle path

**bundle_short_version** - keyword, text.text

* *apps.bundle_short_version* - Info properties CFBundleShortVersionString label

**bundle_version** - keyword, text.text

* *apps.bundle_version* - Info properties CFBundleVersion label
* *safari_extensions.bundle_version* - The version of the build that identifies an iteration of the bundle

**busy_state** - keyword, number.long

* *iokit_devicetree.busy_state* - 1 if the device is in a busy state else 0
* *iokit_registry.busy_state* - 1 if the node is in a busy state else 0

**bytes** - keyword, number.long

* *curl.bytes* - Number of bytes in the response
* *iptables.bytes* - Number of matching bytes for this rule.

**bytes_available** - keyword, number.long

* *time_machine_destinations.bytes_available* - Bytes available on volume

**bytes_received** - keyword, number.long

* *lxd_networks.bytes_received* - Number of bytes received on this network

**bytes_sent** - keyword, number.long

* *lxd_networks.bytes_sent* - Number of bytes sent on this network

**bytes_used** - keyword, number.long

* *time_machine_destinations.bytes_used* - Bytes used on volume

**ca** - keyword, number.long

* *certificates.ca* - 1 if CA: true (certificate is an authority) else 0

**cache_path** - keyword, text.text

* *quicklook_cache.cache_path* - Path to cache data

**cached** - keyword, number.long

* *lxd_images.cached* - Whether image is cached (1) or not (0)
* *memory_info.cached* - The amount of physical RAM, in bytes, used as cache memory

**capability** - keyword, number.long

* *apparmor_events.capability* - Capability number

**capname** - keyword, text.text

* *apparmor_events.capname* - Capability requested by the process

**caption** - keyword, text.text

* *patches.caption* - Short description of the patch.
* *windows_optional_features.caption* - Caption of feature in settings UI

**captive_login_date** - keyword, number.long

* *wifi_networks.captive_login_date* - Time this network logged in to a captive portal as unix_time

**captive_portal** - keyword, number.long

* *wifi_networks.captive_portal* - 1 if this network has a captive portal, 0 otherwise

**carve** - keyword, number.long

* *carves.carve* - Set this value to '1' to start a file carve

**carve_guid** - keyword, text.text

* *carves.carve_guid* - Identifying value of the carve session

**category** - keyword, text.text

* *apps.category* - The UTI that categorizes the app for the App Store
* *file_events.category* - The category of the file defined in the config
* *ntfs_journal_events.category* - The category that the event originated from
* *power_sensors.category* - The sensor category: currents, voltage, wattage
* *system_extensions.category* - System extension category
* *unified_log.category* - the category of the os_log_t used
* *yara_events.category* - The category of the file

**cdhash** - keyword, text.text

* *es_process_events.cdhash* - Codesigning hash of the process
* *signature.cdhash* - Hash of the application Code Directory

**celsius** - keyword, number.double

* *temperature_sensors.celsius* - Temperature in Celsius

**certificate** - keyword, text.text

* *lxd_certificates.certificate* - Certificate content

**cgroup_driver** - keyword, text.text

* *docker_info.cgroup_driver* - Control groups driver

**cgroup_namespace** - keyword, text.text

* *docker_containers.cgroup_namespace* - cgroup namespace
* *process_namespaces.cgroup_namespace* - cgroup namespace inode

**cgroup_path** - keyword, text.text

* *processes.cgroup_path* - The full hierarchical path of the process's control group

**chain** - keyword, text.text

* *iptables.chain* - Size of module content.

**change_type** - keyword, text.text

* *docker_container_fs_changes.change_type* - Type of change: C:Modified, A:Added, D:Deleted

**channel** - keyword

* *wifi_status.channel* - Channel number
* *wifi_survey.channel* - Channel number
* *windows_eventlog.channel* - Source or channel of the event

**channel_band** - keyword, number.long

* *wifi_status.channel_band* - Channel band
* *wifi_survey.channel_band* - Channel band

**channel_width** - keyword, number.long

* *wifi_status.channel_width* - Channel width
* *wifi_survey.channel_width* - Channel width

**charged** - keyword, number.long

* *battery.charged* - 1 if the battery is currently completely charged. 0 otherwise

**charging** - keyword, number.long

* *battery.charging* - 1 if the battery is currently being charged by a power source. 0 otherwise

**chassis_types** - keyword, text.text

* *chassis_info.chassis_types* - A comma-separated list of chassis types, such as Desktop or Laptop.

**check_array_finish** - keyword, text.text

* *md_devices.check_array_finish* - Estimated duration of the check array activity

**check_array_progress** - keyword, text.text

* *md_devices.check_array_progress* - Progress of the check array activity

**check_array_speed** - keyword, text.text

* *md_devices.check_array_speed* - Speed of the check array activity

**checksum** - keyword, text.text

* *disk_events.checksum* - UDIF Master checksum if available (CRC32)

**chemistry** - keyword, text.text

* *battery.chemistry* - The battery chemistry type (eg. LiP). Some possible values are documented in [https://learn.microsoft.com/en-us/windows/win32/power/battery-information-str](https://learn.microsoft.com/en-us/windows/win32/power/battery-information-str).

**child_pid** - keyword, number.long

* *es_process_events.child_pid* - Process ID of a child process in case of a fork event

**chunk_size** - keyword, number.long

* *md_devices.chunk_size* - chunk size in bytes

**cid** - keyword, number.long

* *bpf_process_events.cid* - Cgroup ID
* *bpf_socket_events.cid* - Cgroup ID

**class** - keyword, text.text

* *authorizations.class* - Label top-level key
* *drivers.class* - Device/driver class name
* *iokit_devicetree.class* - Best matching device class (most-specific category)
* *iokit_registry.class* - Best matching device class (most-specific category)
* *usb_devices.class* - USB Device class
* *wmi_cli_event_consumers.class* - The name of the class.
* *wmi_event_filters.class* - The name of the class.
* *wmi_filter_consumer_binding.class* - The name of the class.
* *wmi_script_event_consumers.class* - The name of the class.

**clear_text_password** - keyword, number.long

* *security_profile_info.clear_text_password* - Determines whether passwords MUST be stored by using reversible encryption

**client_app_id** - keyword, text.text

* *windows_update_history.client_app_id* - Identifier of the client application that processed an update

**client_site_name** - keyword, text.text

* *ntdomains.client_site_name* - The name of the site where the domain controller is configured.

**cloud_id** - keyword, text.text

* *ycloud_instance_metadata.cloud_id* - Cloud identifier for the VM

**cmdline** - keyword, text.text

* *bpf_process_events.cmdline* - Command line arguments
* *docker_container_processes.cmdline* - Complete argv
* *es_process_events.cmdline* - Command line arguments (argv)
* *process_etw_events.cmdline* - Command Line
* *process_events.cmdline* - Command line arguments (argv)
* *processes.cmdline* - Complete argv

**cmdline_count** - keyword, number.long

* *es_process_events.cmdline_count* - Number of command line arguments

**cmdline_size** - keyword, number.long

* *process_events.cmdline_size* - Actual size (bytes) of command line arguments

**code** - keyword, text.text

* *seccomp_events.code* - The seccomp action

**code_integrity_policy_enforcement_status** - keyword, text.text

* *deviceguard_status.code_integrity_policy_enforcement_status* - The status of the code integrity policy enforcement settings. Returns UNKNOWN if an error is encountered.

**codename** - keyword, text.text

* *os_version.codename* - OS version codename

**codesigning_flags** - keyword, text.text

* *es_process_events.codesigning_flags* - Codesigning flags matching one of these options, in a comma separated list: NOT_VALID, ADHOC, NOT_RUNTIME, INSTALLER. See kern/cs_blobs.h in XNU for descriptions.

**collect_cross_processes** - keyword, number.long

* *carbon_black_info.collect_cross_processes* - If the sensor is configured to cross process events

**collect_data_file_writes** - keyword, number.long

* *carbon_black_info.collect_data_file_writes* - If the sensor is configured to collect non binary file writes

**collect_emet_events** - keyword, number.long

* *carbon_black_info.collect_emet_events* - If the sensor is configured to EMET events

**collect_file_mods** - keyword, number.long

* *carbon_black_info.collect_file_mods* - If the sensor is configured to collect file modification events

**collect_module_info** - keyword, number.long

* *carbon_black_info.collect_module_info* - If the sensor is configured to collect metadata of binaries

**collect_module_loads** - keyword, number.long

* *carbon_black_info.collect_module_loads* - If the sensor is configured to capture module loads

**collect_net_conns** - keyword, number.long

* *carbon_black_info.collect_net_conns* - If the sensor is configured to collect network connections

**collect_process_user_context** - keyword, number.long

* *carbon_black_info.collect_process_user_context* - If the sensor is configured to collect the user running a process

**collect_processes** - keyword, number.long

* *carbon_black_info.collect_processes* - If the sensor is configured to process events

**collect_reg_mods** - keyword, number.long

* *carbon_black_info.collect_reg_mods* - If the sensor is configured to collect registry modification events

**collect_sensor_operations** - keyword, number.long

* *carbon_black_info.collect_sensor_operations* - Unknown

**collect_store_files** - keyword, number.long

* *carbon_black_info.collect_store_files* - If the sensor is configured to send back binaries to the Carbon Black server

**collisions** - keyword, number.long

* *interface_details.collisions* - Packet Collisions detected

**color_depth** - keyword, number.long

* *video_info.color_depth* - The amount of bits per pixel to represent color.

**comm** - keyword, text.text

* *apparmor_events.comm* - Command-line name of the command that was used to invoke the analyzed process
* *seccomp_events.comm* - Command-line name of the command that was used to invoke the analyzed process

**command** - keyword, text.text

* *crontab.command* - Raw command string
* *docker_containers.command* - Command with arguments
* *shell_history.command* - Unparsed date/line/command history line

**command_line** - keyword, text.text

* *windows_crashes.command_line* - Command-line string passed to the crashed process

**command_line_template** - keyword, text.text

* *wmi_cli_event_consumers.command_line_template* - Standard string template that specifies the process to be started. This property can be NULL, and the ExecutablePath property is used as the command line.

**comment** - keyword, text.text

* *authorizations.comment* - Label top-level key
* *authorized_keys.comment* - Optional comment
* *docker_image_history.comment* - Instruction comment
* *etc_protocols.comment* - Comment with protocol description
* *etc_services.comment* - Optional comment for a service.
* *groups.comment* - Remarks or comments associated with the group
* *keychain_items.comment* - Optional keychain comment

**common_name** - keyword, text.text

* *certificates.common_name* - Certificate CommonName
* *curl_certificate.common_name* - Common name of company issued to

**compat** - keyword, number.long

* *seccomp_events.compat* - Is system call in compatibility mode

**compiler** - keyword, text.text

* *apps.compiler* - Info properties DTCompiler label

**completed_time** - keyword, number.long

* *cups_jobs.completed_time* - When the job completed printing

**components** - keyword, text.text

* *apt_sources.components* - Repository components

**compressed** - keyword, number.long

* *virtual_memory_info.compressed* - The total number of pages that have been compressed by the VM compressor.

**compressor** - keyword, number.long

* *virtual_memory_info.compressor* - The number of pages used to store compressed VM pages.

**computer_name** - keyword, text.text

* *system_info.computer_name* - Friendly computer name (optional)
* *windows_eventlog.computer_name* - Hostname of system where event was generated
* *windows_events.computer_name* - Hostname of system where event was generated

**condition** - keyword, text.text

* *battery.condition* - One of the following: "Normal" indicates the condition of the battery is within normal tolerances, "Service Needed" indicates that the battery should be checked out by a licensed Mac repair service, "Permanent Failure" indicates the battery needs replacement

**config_entrypoint** - keyword, text.text

* *docker_containers.config_entrypoint* - Container entrypoint(s)

**config_flag** - keyword, text.text

* *sip_config.config_flag* - The System Integrity Protection config flag

**config_hash** - keyword, text.text

* *osquery_info.config_hash* - Hash of the working configuration state

**config_name** - keyword, text.text

* *carbon_black_info.config_name* - Sensor group

**config_valid** - keyword, number.long

* *osquery_info.config_valid* - 1 if the config was loaded and considered valid, else 0

**config_value** - keyword, text.text

* *system_controls.config_value* - The MIB value set in /etc/sysctl.conf

**configured_clock_speed** - keyword, number.long

* *memory_devices.configured_clock_speed* - Configured speed of memory device in megatransfers per second (MT/s)

**configured_security_services** - keyword, text.text

* *deviceguard_status.configured_security_services* - The list of configured Device Guard services. Returns UNKNOWN if an error is encountered.

**configured_voltage** - keyword, number.long

* *memory_devices.configured_voltage* - Configured operating voltage of device in millivolts

**connection_id** - keyword, text.text

* *interface_details.connection_id* - Name of the network connection as it appears in the Network Connections Control Panel program.

**connection_status** - keyword, text.text

* *interface_details.connection_status* - State of the network adapter connection to the network.

**connection_type** - keyword, text.text

* *connected_displays.connection_type* - The connection type associated with the display.

**consistency_scan_date** - keyword, number.long

* *time_machine_destinations.consistency_scan_date* - Consistency scan date

**consumer** - keyword, text.text

* *wmi_filter_consumer_binding.consumer* - Reference to an instance of __EventConsumer that represents the object path to a logical consumer, the recipient of an event.

**containers** - keyword, number.long

* *docker_info.containers* - Total number of containers

**containers_paused** - keyword, number.long

* *docker_info.containers_paused* - Number of containers in paused state

**containers_running** - keyword, number.long

* *docker_info.containers_running* - Number of containers currently running

**containers_stopped** - keyword, number.long

* *docker_info.containers_stopped* - Number of containers in stopped state

**content** - keyword, text.text

* *disk_events.content* - Disk event content

**content_caching** - keyword, number.long

* *sharing_preferences.content_caching* - 1 If content caching is enabled else 0

**content_type** - keyword, text.text

* *package_install_history.content_type* - Package content_type (optional)

**conversion_status** - keyword, number.long

* *bitlocker_info.conversion_status* - The bitlocker conversion status of the drive.

**coprocessor_version** - keyword, text.text

* *ibridge_info.coprocessor_version* - The manufacturer and chip version

**copy** - keyword, number.long

* *virtual_memory_info.copy* - Total number of copy-on-write pages.

**copyright** - keyword, text.text

* *apps.copyright* - Info properties NSHumanReadableCopyright label
* *safari_extensions.copyright* - A human-readable copyright notice for the bundle

**core** - keyword, number.long

* *cpu_time.core* - Name of the cpu (core)

**cosine_similarity** - keyword, number.double

* *powershell_events.cosine_similarity* - How similar the Powershell script is to a provided 'normal' character frequency

**count** - keyword, number.long

* *userassist.count* - Number of times the application has been executed.
* *yara.count* - Number of YARA matches
* *yara_events.count* - Number of YARA matches

**country_code** - keyword, text.text

* *wifi_status.country_code* - The country code (ISO/IEC 3166-1:1997) for the network
* *wifi_survey.country_code* - The country code (ISO/IEC 3166-1:1997) for the network

**cpu** - keyword, number.double

* *docker_container_processes.cpu* - CPU utilization as percentage

**cpu_brand** - keyword, text.text

* *system_info.cpu_brand* - CPU brand string, contains vendor and model

**cpu_cfs_period** - keyword, number.long

* *docker_info.cpu_cfs_period* - 1 if CPU Completely Fair Scheduler (CFS) period support is enabled. 0 otherwise

**cpu_cfs_quota** - keyword, number.long

* *docker_info.cpu_cfs_quota* - 1 if CPU Completely Fair Scheduler (CFS) quota support is enabled. 0 otherwise

**cpu_kernelmode_usage** - keyword, number.long

* *docker_container_stats.cpu_kernelmode_usage* - CPU kernel mode usage

**cpu_logical_cores** - keyword, number.long

* *system_info.cpu_logical_cores* - Number of logical CPU cores available to the system

**cpu_microcode** - keyword, text.text

* *system_info.cpu_microcode* - Microcode version

**cpu_physical_cores** - keyword, number.long

* *system_info.cpu_physical_cores* - Number of physical CPU cores in to the system

**cpu_pred_cmd_supported** - keyword, number.long

* *kva_speculative_info.cpu_pred_cmd_supported* - PRED_CMD MSR supported by CPU Microcode.

**cpu_set** - keyword, number.long

* *docker_info.cpu_set* - 1 if CPU set selection support is enabled. 0 otherwise

**cpu_shares** - keyword, number.long

* *docker_info.cpu_shares* - 1 if CPU share weighting support is enabled. 0 otherwise

**cpu_sockets** - keyword, number.long

* *system_info.cpu_sockets* - Number of processor sockets in the system

**cpu_spec_ctrl_supported** - keyword, number.long

* *kva_speculative_info.cpu_spec_ctrl_supported* - SPEC_CTRL MSR supported by CPU Microcode.

**cpu_status** - keyword, number.long

* *cpu_info.cpu_status* - The current operating status of the CPU.

**cpu_subtype** - keyword

* *processes.cpu_subtype* - Indicates the specific processor on which an entry may be used.
* *system_info.cpu_subtype* - CPU subtype

**cpu_total_usage** - keyword, number.long

* *docker_container_stats.cpu_total_usage* - Total CPU usage

**cpu_type** - keyword

* *processes.cpu_type* - Indicates the specific processor designed for installation.
* *system_info.cpu_type* - CPU type

**cpu_usermode_usage** - keyword, number.long

* *docker_container_stats.cpu_usermode_usage* - CPU user mode usage

**cpus** - keyword, number.long

* *docker_info.cpus* - Number of CPUs

**crash_path** - keyword, text.text

* *crashes.crash_path* - Location of log file
* *windows_crashes.crash_path* - Path of the log file

**crashed_thread** - keyword, number.long

* *crashes.crashed_thread* - Thread ID which crashed

**created** - keyword, text.text

* *authorizations.created* - Label top-level key
* *docker_containers.created* - Time of creation as UNIX time
* *docker_image_history.created* - Time of creation as UNIX time
* *docker_images.created* - Time of creation as UNIX time
* *docker_networks.created* - Time of creation as UNIX time
* *keychain_items.created* - Date item was created

**created_at** - keyword, text.text

* *lxd_images.created_at* - ISO time of image creation
* *lxd_instances.created_at* - ISO time of creation

**created_by** - keyword, text.text

* *docker_image_history.created_by* - Created by instruction

**created_time** - keyword, number.long

* *shellbags.created_time* - Directory Created time.

**creation_time** - keyword

* *account_policy_data.creation_time* - When the account was first created
* *cups_jobs.creation_time* - When the print request was initiated

**creator** - keyword, text.text

* *firefox_addons.creator* - Addon-supported creator string

**creator_pid** - keyword, number.long

* *shared_memory.creator_pid* - Process ID that created the segment

**creator_uid** - keyword, number.long

* *shared_memory.creator_uid* - User ID of creator process

**csname** - keyword, text.text

* *patches.csname* - The name of the host the patch is installed on.

**ctime** - keyword

* *device_file.ctime* - Creation time
* *file.ctime* - Last status change time
* *file_events.ctime* - Last status change time
* *gatekeeper_approved_apps.ctime* - Last change time
* *process_events.ctime* - File last metadata change in UNIX time
* *shared_memory.ctime* - Changed time

**current_capacity** - keyword, number.long

* *battery.current_capacity* - The battery's current capacity (level of charge) in mAh

**current_clock_speed** - keyword, number.long

* *cpu_info.current_clock_speed* - The current frequency of the CPU.

**current_directory** - keyword, text.text

* *windows_crashes.current_directory* - Current working directory of the crashed process

**current_disk_queue_length** - keyword, number.long

* *physical_disk_performance.current_disk_queue_length* - Number of requests outstanding on the disk at the time the performance data is collected

**current_locale** - keyword, text.text

* *chrome_extensions.current_locale* - Current locale supported by extension

**current_value** - keyword, text.text

* *system_controls.current_value* - Value of setting

**cwd** - keyword, text.text

* *bpf_process_events.cwd* - Current working directory
* *es_process_events.cwd* - The process current working directory
* *process_events.cwd* - The process current working directory
* *process_file_events.cwd* - The current working directory of the process
* *processes.cwd* - Process current working directory

**cycle_count** - keyword, number.long

* *battery.cycle_count* - The number of charge/discharge cycles

**data** - keyword, text.text

* *magic.data* - Magic number data from libmagic
* *registry.data* - Data content of registry value
* *windows_eventlog.data* - Data associated with the event
* *windows_events.data* - Data associated with the event

**data_width** - keyword, number.long

* *memory_devices.data_width* - Data width, in bits, of this memory device

**database** - keyword, number.long

* *lxd_cluster_members.database* - Whether the server is a database node (1) or not (0)

**date** - keyword

* *drivers.date* - Driver date
* *platform_info.date* - Self-reported platform code update date
* *windows_update_history.date* - Date and the time an update was applied

**date_created** - keyword, number.long

* *windows_search.date_created* - The unix timestamp of when the item was created.

**date_modified** - keyword, number.long

* *windows_search.date_modified* - The unix timestamp of when the item was last modified

**datetime** - keyword, text.text

* *crashes.datetime* - Date/Time at which the crash occurred
* *powershell_events.datetime* - System time at which the Powershell script event occurred
* *process_etw_events.datetime* - Event timestamp in DATETIME format
* *syslog_events.datetime* - Time known to syslog
* *time.datetime* - Current date and time (ISO format) in UTC
* *windows_crashes.datetime* - Timestamp (log format) of the crash
* *windows_eventlog.datetime* - System time at which the event occurred
* *windows_events.datetime* - System time at which the event occurred

**day** - keyword, number.long

* *time.day* - Current day in UTC

**day_of_month** - keyword, text.text

* *crontab.day_of_month* - The day of the month for the job

**day_of_week** - keyword, text.text

* *crontab.day_of_week* - The day of the week for the job

**days** - keyword, number.long

* *uptime.days* - Days of uptime

**dc_site_name** - keyword, text.text

* *ntdomains.dc_site_name* - The name of the site where the domain controller is located.

**decompressed** - keyword, number.long

* *virtual_memory_info.decompressed* - The total number of pages that have been decompressed by the VM compressor.

**default_locale** - keyword, text.text

* *chrome_extensions.default_locale* - Default locale supported by extension

**default_value** - keyword, text.text

* *osquery_flags.default_value* - Flag default value

**denied_mask** - keyword, text.text

* *apparmor_events.denied_mask* - Denied permissions for the process

**denylisted** - keyword, number.long

* *osquery_schedule.denylisted* - 1 if the query is denylisted else 0

**dependencies** - keyword, text.text

* *kernel_panics.dependencies* - Module dependencies existing in crashed module's backtrace

**depth** - keyword, number.long

* *iokit_devicetree.depth* - Device nested depth
* *iokit_registry.depth* - Node nested depth

**description** - keyword, text.text

* *appcompat_shims.description* - Description of the SDB.
* *browser_plugins.description* - Plugin description text
* *chassis_info.description* - An extended description of the chassis if available.
* *chrome_extensions.description* - Extension-optional description
* *disk_info.description* - The OS's description of the disk.
* *drivers.description* - Driver description
* *firefox_addons.description* - Addon-supplied description string
* *interface_details.description* - Short description of the object a one-line string.
* *kernel_keys.description* - The key description.
* *keychain_acls.description* - The description included with the ACL entry
* *keychain_items.description* - Optional item description
* *logical_drives.description* - The canonical description of the drive, e.g. 'Logical Fixed Disk', 'CD-ROM Disk'.
* *lxd_images.description* - Image description
* *lxd_instances.description* - Instance description
* *npm_packages.description* - Package-supplied description
* *osquery_flags.description* - Flag description
* *patches.description* - Fuller description of the patch.
* *safari_extensions.description* - Optional extension description text
* *secureboot.description* - (Apple Silicon) Human-readable description: 'Full Security', 'Reduced Security', or 'Permissive Security'
* *services.description* - Service Description
* *shared_resources.description* - A textual description of the object
* *smbios_tables.description* - Table entry description
* *systemd_units.description* - Unit description
* *users.description* - Optional user description
* *windows_update_history.description* - Description of an update
* *ycloud_instance_metadata.description* - Description of the VM

**designed_capacity** - keyword, number.long

* *battery.designed_capacity* - The battery's designed capacity in mAh

**dest_filename** - keyword, text.text

* *es_process_file_events.dest_filename* - Destination filename for the event

**dest_path** - keyword, text.text

* *process_file_events.dest_path* - The canonical path associated with the event

**destination** - keyword, text.text

* *cups_jobs.destination* - The printer the job was sent to
* *docker_container_mounts.destination* - Destination path inside container
* *routes.destination* - Destination IP address

**destination_id** - keyword, text.text

* *time_machine_backups.destination_id* - Time Machine destination ID
* *time_machine_destinations.destination_id* - Time Machine destination ID

**dev_id_enabled** - keyword, number.long

* *gatekeeper.dev_id_enabled* - 1 If a Gatekeeper allows execution from identified developers else 0

**developer_id** - keyword, text.text

* *xprotect_meta.developer_id* - Developer identity (SHA1) of extension

**development_region** - keyword, text.text

* *apps.development_region* - Info properties CFBundleDevelopmentRegion label
* *browser_plugins.development_region* - Plugin language-localization

**device** - keyword, text.text

* *device_file.device* - Absolute file path to device node
* *device_firmware.device* - The device name
* *device_hash.device* - Absolute file path to device node
* *device_partitions.device* - Absolute file path to device node
* *disk_events.device* - Disk event BSD name
* *file.device* - Device ID (optional)
* *kernel_info.device* - Kernel device identifier
* *lxd_instance_devices.device* - Name of the device
* *mounts.device* - Mounted device
* *process_memory_map.device* - MA:MI Major/minor device ID

**device_alias** - keyword, text.text

* *mounts.device_alias* - Mounted device alias

**device_error_address** - keyword, text.text

* *memory_error_info.device_error_address* - 32 bit physical address of the error relative to the start of the failing memory address, in bytes

**device_id** - keyword, text.text

* *bitlocker_info.device_id* - ID of the encrypted drive.
* *cpu_info.device_id* - The DeviceID of the CPU.
* *drivers.device_id* - Device ID
* *logical_drives.device_id* - The drive id, usually the drive name, e.g., 'C:'.

**device_locator** - keyword, text.text

* *memory_devices.device_locator* - String number of the string that identifies the physically-labeled socket or board position where the memory device is located

**device_name** - keyword, text.text

* *drivers.device_name* - Device name
* *md_devices.device_name* - md device name

**device_path** - keyword, text.text

* *iokit_devicetree.device_path* - Device tree path

**device_type** - keyword, text.text

* *lxd_instance_devices.device_type* - Device type

**dhcp_enabled** - keyword, number.long

* *interface_details.dhcp_enabled* - If TRUE, the dynamic host configuration protocol (DHCP) server automatically assigns an IP address to the computer system when establishing a network connection.

**dhcp_lease_expires** - keyword, text.text

* *interface_details.dhcp_lease_expires* - Expiration date and time for a leased IP address that was assigned to the computer by the dynamic host configuration protocol (DHCP) server.

**dhcp_lease_obtained** - keyword, text.text

* *interface_details.dhcp_lease_obtained* - Date and time the lease was obtained for the IP address assigned to the computer by the dynamic host configuration protocol (DHCP) server.

**dhcp_server** - keyword, text.text

* *interface_details.dhcp_server* - IP address of the dynamic host configuration protocol (DHCP) server.

**direction** - keyword, text.text

* *windows_firewall_rules.direction* - Direction of traffic for which the rule applies

**directory** - keyword, text.text

* *extended_attributes.directory* - Directory of file(s)
* *file.directory* - Directory of file(s)
* *hash.directory* - Must provide a path or directory
* *npm_packages.directory* - Directory where node_modules are located
* *python_packages.directory* - Directory where Python modules are located
* *users.directory* - User's home directory

**disabled** - keyword

* *browser_plugins.disabled* - Is the plugin disabled. 1 = Disabled
* *firefox_addons.disabled* - 1 If the addon is application-disabled else 0
* *launchd.disabled* - Skip loading this daemon or agent on boot
* *wifi_networks.disabled* - 1 if this network is disabled, 0 otherwise

**disc_sharing** - keyword, number.long

* *sharing_preferences.disc_sharing* - 1 If CD or DVD sharing is enabled else 0

**disconnected** - keyword, number.long

* *connectivity.disconnected* - True if the all interfaces are not connected to any network

**discovery_cache_hits** - keyword, number.long

* *osquery_packs.discovery_cache_hits* - The number of times that the discovery query used cached values since the last time the config was reloaded

**discovery_executions** - keyword, number.long

* *osquery_packs.discovery_executions* - The number of times that the discovery queries have been executed since the last time the config was reloaded

**disk_bytes_read** - keyword, number.long

* *processes.disk_bytes_read* - Bytes read from disk

**disk_bytes_written** - keyword, number.long

* *processes.disk_bytes_written* - Bytes written to disk

**disk_index** - keyword, number.long

* *disk_info.disk_index* - Physical drive number of the disk.

**disk_read** - keyword, number.long

* *docker_container_stats.disk_read* - Total disk read bytes

**disk_size** - keyword, number.long

* *disk_info.disk_size* - Size of the disk.

**disk_write** - keyword, number.long

* *docker_container_stats.disk_write* - Total disk write bytes

**display_id** - keyword, text.text

* *connected_displays.display_id* - The display ID.

**display_name** - keyword, text.text

* *apps.display_name* - Info properties CFBundleDisplayName label
* *services.display_name* - Service Display name

**display_type** - keyword, text.text

* *connected_displays.display_type* - The type of display.

**dns_domain** - keyword, text.text

* *interface_details.dns_domain* - Organization name followed by a period and an extension that indicates the type of organization, such as 'microsoft.com'.

**dns_domain_name** - keyword, text.text

* *logon_sessions.dns_domain_name* - The DNS name for the owner of the logon session.

**dns_domain_suffix_search_order** - keyword, text.text

* *interface_details.dns_domain_suffix_search_order* - Array of DNS domain suffixes to be appended to the end of host names during name resolution.

**dns_forest_name** - keyword, text.text

* *ntdomains.dns_forest_name* - The name of the root of the DNS tree.

**dns_host_name** - keyword, text.text

* *interface_details.dns_host_name* - Host name used to identify the local computer for authentication by some utilities.

**dns_server_search_order** - keyword, text.text

* *interface_details.dns_server_search_order* - Array of server IP addresses to be used in querying for DNS servers.

**domain** - keyword, text.text

* *ad_config.domain* - Active Directory trust domain
* *managed_policies.domain* - System or manager-chosen domain key
* *preferences.domain* - Application ID usually in com.name.product format

**domain_controller_address** - keyword, text.text

* *ntdomains.domain_controller_address* - The IP Address of the discovered domain controller..

**domain_controller_name** - keyword, text.text

* *ntdomains.domain_controller_name* - The name of the discovered domain controller.

**domain_name** - keyword, text.text

* *ntdomains.domain_name* - The name of the domain.

**drive_letter** - keyword, text.text

* *bitlocker_info.drive_letter* - Drive letter of the encrypted drive.
* *ntfs_journal_events.drive_letter* - The drive letter identifying the source journal

**drive_name** - keyword, text.text

* *md_drives.drive_name* - Drive device name

**driver** - keyword, text.text

* *docker_container_mounts.driver* - Driver providing the mount
* *docker_networks.driver* - Network driver
* *docker_volumes.driver* - Volume driver
* *hardware_events.driver* - Driver claiming the device
* *lxd_storage_pools.driver* - Storage driver
* *pci_devices.driver* - PCI Device used driver
* *video_info.driver* - The driver of the device.

**driver_date** - keyword, number.long

* *video_info.driver_date* - The date listed on the installed driver.

**driver_key** - keyword, text.text

* *drivers.driver_key* - Driver key

**driver_version** - keyword, text.text

* *video_info.driver_version* - The version of the installed driver.

**dst_ip** - keyword, text.text

* *iptables.dst_ip* - Destination IP address.

**dst_mask** - keyword, text.text

* *iptables.dst_mask* - Destination IP address mask.

**dst_port** - keyword, text.text

* *iptables.dst_port* - Protocol destination port(s).

**dtime** - keyword, number.long

* *shared_memory.dtime* - Detached time

**dump_certificate** - keyword, number.long

* *curl_certificate.dump_certificate* - Set this value to '1' to dump certificate

**duration** - keyword, number.long

* *bpf_process_events.duration* - How much time was spent inside the syscall (nsecs)
* *bpf_socket_events.duration* - How much time was spent inside the syscall (nsecs)

**eapi** - keyword, number.long

* *portage_packages.eapi* - The eapi for the ebuild

**egid** - keyword

* *docker_container_processes.egid* - Effective group ID
* *es_process_events.egid* - Effective Group ID of the process
* *process_events.egid* - Effective group ID at process start
* *process_file_events.egid* - Effective group ID of the process using the file
* *processes.egid* - Unsigned effective group ID

**eid** - keyword, text.text

* *apparmor_events.eid* - Event ID
* *bpf_process_events.eid* - Event ID
* *bpf_socket_events.eid* - Event ID
* *disk_events.eid* - Event ID
* *es_process_events.eid* - Event ID
* *es_process_file_events.eid* - Event ID
* *file_events.eid* - Event ID
* *hardware_events.eid* - Event ID
* *ntfs_journal_events.eid* - Event ID
* *process_etw_events.eid* - Event ID
* *process_events.eid* - Event ID
* *process_file_events.eid* - Event ID
* *selinux_events.eid* - Event ID
* *socket_events.eid* - Event ID
* *syslog_events.eid* - Event ID
* *user_events.eid* - Event ID
* *windows_events.eid* - Event ID
* *yara_events.eid* - Event ID

**ejectable** - keyword, number.long

* *disk_events.ejectable* - 1 if ejectable, 0 if not

**elapsed_time** - keyword, number.long

* *processes.elapsed_time* - Elapsed time in seconds this process has been running.

**element** - keyword, text.text

* *apps.element* - Does the app identify as a background agent

**elevated_token** - keyword, number.long

* *processes.elevated_token* - Process uses elevated token yes=1, no=0

**enable_admin_account** - keyword, number.long

* *security_profile_info.enable_admin_account* - Determines whether the Administrator account on the local computer is enabled

**enable_guest_account** - keyword, number.long

* *security_profile_info.enable_guest_account* - Determines whether the Guest account on the local computer is enabled

**enable_ipv6** - keyword, number.long

* *docker_networks.enable_ipv6* - 1 if IPv6 is enabled on this network. 0 otherwise

**enabled** - keyword

* *app_schemes.enabled* - 1 if this handler is the OS default, else 0
* *event_taps.enabled* - Is the Event Tap enabled
* *interface_details.enabled* - Indicates whether the adapter is enabled or not.
* *location_services.enabled* - 1 if Location Services are enabled, else 0
* *lxd_cluster.enabled* - Whether clustering enabled (1) or not (0) on this node
* *sandboxes.enabled* - Application sandboxings enabled on container
* *scheduled_tasks.enabled* - Whether or not the scheduled task is enabled
* *screenlock.enabled* - 1 If a password is required after sleep or the screensaver begins; else 0
* *sip_config.enabled* - 1 if this configuration is enabled, otherwise 0
* *tpm_info.enabled* - TPM is enabled
* *windows_firewall_rules.enabled* - 1 if the rule is enabled
* *yum_sources.enabled* - Whether the repository is used

**enabled_nvram** - keyword, number.long

* *sip_config.enabled_nvram* - 1 if this configuration is enabled, otherwise 0

**encrypted** - keyword, number.long

* *disk_encryption.encrypted* - 1 If encrypted: true (disk is encrypted), else 0
* *user_ssh_keys.encrypted* - 1 if key is encrypted, 0 otherwise

**encryption** - keyword, text.text

* *time_machine_destinations.encryption* - Last known encrypted state

**encryption_method** - keyword, text.text

* *bitlocker_info.encryption_method* - The encryption type of the device.

**encryption_status** - keyword, text.text

* *disk_encryption.encryption_status* - Disk encryption status with one of following values: encrypted | not encrypted | undefined

**end** - keyword, text.text

* *memory_map.end* - End address of memory region
* *process_memory_map.end* - Virtual end address (hex)

**ending_address** - keyword, text.text

* *memory_array_mapped_addresses.ending_address* - Physical ending address of last kilobyte of a range of memory mapped to physical memory array
* *memory_device_mapped_addresses.ending_address* - Physical ending address of last kilobyte of a range of memory mapped to physical memory array

**endpoint_id** - keyword, text.text

* *docker_container_networks.endpoint_id* - Endpoint ID

**entry** - keyword, text.text

* *authorization_mechanisms.entry* - The whole string entry
* *shimcache.entry* - Execution order.

**env** - keyword, text.text

* *es_process_events.env* - Environment variables delimited by spaces
* *process_events.env* - Environment variables delimited by spaces

**env_count** - keyword, number.long

* *es_process_events.env_count* - Number of environment variables
* *process_events.env_count* - Number of environment variables

**env_size** - keyword, number.long

* *process_events.env_size* - Actual size (bytes) of environment list

**env_variables** - keyword, text.text

* *docker_containers.env_variables* - Container environmental variables

**environment** - keyword, text.text

* *apps.environment* - Application-set environment variables

**ephemeral** - keyword, number.long

* *lxd_instances.ephemeral* - Whether the instance is ephemeral(1) or not(0)

**epoch** - keyword, number.long

* *rpm_packages.epoch* - Package epoch value

**error** - keyword, text.text

* *apparmor_events.error* - Error information

**error_granularity** - keyword, text.text

* *memory_error_info.error_granularity* - Granularity to which the error can be resolved

**error_operation** - keyword, text.text

* *memory_error_info.error_operation* - Memory access operation that caused the error

**error_resolution** - keyword, text.text

* *memory_error_info.error_resolution* - Range, in bytes, within which this error can be determined, when an error address is given

**error_type** - keyword, text.text

* *memory_error_info.error_type* - type of error associated with current error status for array or device

**euid** - keyword

* *docker_container_processes.euid* - Effective user ID
* *es_process_events.euid* - Effective User ID of the process
* *process_events.euid* - Effective user ID at process start
* *process_file_events.euid* - Effective user ID of the process using the file
* *processes.euid* - Unsigned effective user ID

**event** - keyword, text.text

* *crontab.event* - The job @event name (rare)

**event_queue** - keyword, number.long

* *carbon_black_info.event_queue* - Size in bytes of Carbon Black event files on disk

**event_tap_id** - keyword, number.long

* *event_taps.event_tap_id* - Unique ID for the Tap

**event_tapped** - keyword, text.text

* *event_taps.event_tapped* - The mask that identifies the set of events to be observed.

**event_type** - keyword, text.text

* *es_process_events.event_type* - Type of EndpointSecurity event
* *es_process_file_events.event_type* - Type of EndpointSecurity event

**eventid** - keyword, number.long

* *windows_eventlog.eventid* - Event ID of the event
* *windows_events.eventid* - Event ID of the event

**events** - keyword, number.long

* *osquery_events.events* - Number of events emitted or received since osquery started

**exception_address** - keyword, text.text

* *windows_crashes.exception_address* - Address (in hex) where the exception occurred

**exception_code** - keyword, text.text

* *windows_crashes.exception_code* - The Windows exception code

**exception_codes** - keyword, text.text

* *crashes.exception_codes* - Exception codes from the crash

**exception_message** - keyword, text.text

* *windows_crashes.exception_message* - The NTSTATUS error message associated with the exception code

**exception_notes** - keyword, text.text

* *crashes.exception_notes* - Exception notes from the crash

**exception_type** - keyword, text.text

* *crashes.exception_type* - Exception type of the crash

**exe** - keyword, text.text

* *seccomp_events.exe* - The path to the executable that was used to invoke the analyzed process

**executable** - keyword, text.text

* *appcompat_shims.executable* - Name of the executable that is being shimmed. This is pulled from the registry.
* *process_file_events.executable* - The executable path

**executable_path** - keyword, text.text

* *wmi_cli_event_consumers.executable_path* - Module to execute. The string can specify the full path and file name of the module to execute, or it can specify a partial name. If a partial name is specified, the current drive and current directory are assumed.

**execution_flag** - keyword, number.long

* *shimcache.execution_flag* - Boolean Execution flag, 1 for execution, 0 for no execution, -1 for missing (this flag does not exist on Windows 10 and higher).

**executions** - keyword, number.long

* *osquery_schedule.executions* - Number of times the query was executed

**exit_code** - keyword, text.text

* *bpf_process_events.exit_code* - Exit code of the system call
* *bpf_socket_events.exit_code* - Exit code of the system call
* *es_process_events.exit_code* - Exit code of a process in case of an exit event
* *process_etw_events.exit_code* - Exit Code - Present only on ProcessStop events

**expand** - keyword, number.long

* *default_environment.expand* - 1 if the variable needs expanding, 0 otherwise

**expire** - keyword, number.long

* *shadow.expire* - Number of days since UNIX epoch date until account is disabled

**expires_at** - keyword, text.text

* *lxd_images.expires_at* - ISO time of image expiration

**extended_key_usage** - keyword, text.text

* *curl_certificate.extended_key_usage* - Extended usage of key in certificate

**extensions** - keyword, text.text

* *osquery_info.extensions* - osquery extensions status

**external** - keyword, number.long

* *app_schemes.external* - 1 if this handler does NOT exist on macOS by default, else 0

**extra** - keyword, text.text

* *asl.extra* - Extra columns, in JSON format. Queries against this column are performed entirely in SQLite, so do not benefit from efficient querying via asl.h.
* *os_version.extra* - Optional extra release specification
* *platform_info.extra* - Platform-specific additional information

**facility** - keyword, text.text

* *asl.facility* - Sender's facility.  Default is 'user'.
* *syslog_events.facility* - Syslog facility

**fahrenheit** - keyword, number.double

* *temperature_sensors.fahrenheit* - Temperature in Fahrenheit

**failed_disks** - keyword, number.long

* *md_devices.failed_disks* - Number of failed disks in array

**failed_login_count** - keyword, number.long

* *account_policy_data.failed_login_count* - The number of failed login attempts using an incorrect password. Count resets after a correct password is entered.

**failed_login_timestamp** - keyword, number.double

* *account_policy_data.failed_login_timestamp* - The time of the last failed login attempt. Resets after a correct password is entered

**family** - keyword, number.long

* *bpf_socket_events.family* - The Internet protocol family ID
* *listening_ports.family* - Network protocol (IPv4, IPv6)
* *process_open_sockets.family* - Network protocol (IPv4, IPv6)
* *socket_events.family* - The Internet protocol family ID

**fan** - keyword, text.text

* *fan_speed_sensors.fan* - Fan number

**faults** - keyword, number.long

* *virtual_memory_info.faults* - Total number of calls to vm_faults.

**fd** - keyword, text.text

* *bpf_socket_events.fd* - The file description for the process socket
* *listening_ports.fd* - Socket file descriptor number
* *process_open_files.fd* - Process-specific file descriptor number
* *process_open_pipes.fd* - File descriptor
* *process_open_sockets.fd* - Socket file descriptor number
* *socket_events.fd* - The file description for the process socket

**feature** - keyword, text.text

* *cpuid.feature* - Present feature flags

**feature_control** - keyword, number.long

* *msr.feature_control* - Bitfield controlling enabled features.

**field_name** - keyword, text.text

* *system_controls.field_name* - Specific attribute of opaque type

**file_attributes** - keyword, text.text

* *ntfs_journal_events.file_attributes* - File attributes

**file_backed** - keyword, number.long

* *virtual_memory_info.file_backed* - Total number of file backed pages.

**file_id** - keyword, text.text

* *file.file_id* - file ID

**file_sharing** - keyword, number.long

* *sharing_preferences.file_sharing* - 1 If file sharing is enabled else 0

**file_system** - keyword, text.text

* *logical_drives.file_system* - The file system of the drive.

**file_version** - keyword, text.text

* *file.file_version* - File version

**filename** - keyword, text.text

* *device_file.filename* - Name portion of file path
* *es_process_file_events.filename* - The source or target filename for the event
* *file.filename* - Name portion of file path
* *lxd_images.filename* - Filename of the image file
* *prefetch.filename* - Executable filename.
* *xprotect_entries.filename* - Use this file name to match

**filepath** - keyword, text.text

* *package_bom.filepath* - Package file or directory

**filesystem** - keyword, text.text

* *disk_events.filesystem* - Filesystem if available

**filetype** - keyword, text.text

* *xprotect_entries.filetype* - Use this file type to match

**filevault_status** - keyword, text.text

* *disk_encryption.filevault_status* - FileVault status with one of following values: on | off | unknown

**filter** - keyword, text.text

* *wmi_filter_consumer_binding.filter* - Reference to an instance of __EventFilter that represents the object path to an event filter which is a query that specifies the type of event to be received.

**filter_name** - keyword, text.text

* *iptables.filter_name* - Packet matching filter table name.

**fingerprint** - keyword, text.text

* *lxd_certificates.fingerprint* - SHA256 hash of the certificate

**finished_at** - keyword, text.text

* *docker_containers.finished_at* - Container finish time as string

**firewall** - keyword, text.text

* *windows_security_center.firewall* - The health of the monitored Firewall (see windows_security_products)

**firewall_unload** - keyword, number.long

* *alf.firewall_unload* - 1 If firewall unloading enabled else 0 (not supported on macOS 15+)

**firmware_type** - keyword, text.text

* *platform_info.firmware_type* - The type of firmware (uefi, bios, iboot, openfirmware, unknown).

**firmware_version** - keyword, text.text

* *ibridge_info.firmware_version* - The build version of the firmware

**fix_comments** - keyword, text.text

* *patches.fix_comments* - Additional comments about the patch.

**flag** - keyword, number.long

* *shadow.flag* - Reserved

**flags** - keyword

* *device_partitions.flags* - Value that describes the partition (TSK_VS_PART_FLAG_ENUM)
* *dns_cache.flags* - DNS record flags
* *interface_details.flags* - Flags (netdevice) for the device
* *kernel_keys.flags* - A set of flags describing the state of the key.
* *mounts.flags* - Mounted device flags
* *pipes.flags* - The flags indicating whether this pipe connection is a server or client end, and if the pipe for sending messages or bytes
* *process_etw_events.flags* - Process Flags
* *routes.flags* - Flags to describe route

**folder_id** - keyword, text.text

* *ycloud_instance_metadata.folder_id* - Folder identifier for the VM

**following** - keyword, text.text

* *systemd_units.following* - The name of another unit that this unit follows in state

**force_logoff_when_expire** - keyword, number.long

* *security_profile_info.force_logoff_when_expire* - Determines whether SMB client sessions with the SMB server will be forcibly disconnected when the client's logon hours expire

**forced** - keyword, number.long

* *preferences.forced* - 1 if the value is forced/managed, else 0

**form_factor** - keyword, text.text

* *memory_devices.form_factor* - Implementation form factor for this memory device

**format** - keyword, text.text

* *cups_jobs.format* - The format of the print job

**forwarding_enabled** - keyword, number.long

* *interface_ipv6.forwarding_enabled* - Enable IP forwarding

**fragment_path** - keyword, text.text

* *systemd_units.fragment_path* - The unit file path this unit was read from, if there is any

**frame_backtrace** - keyword, text.text

* *kernel_panics.frame_backtrace* - Backtrace of the crashed module

**free** - keyword, number.long

* *virtual_memory_info.free* - Total number of free pages.

**free_space** - keyword, number.long

* *logical_drives.free_space* - The amount of free space, in bytes, of the drive (-1 on failure).

**friendly_name** - keyword, text.text

* *interface_addresses.friendly_name* - The friendly display name of the interface.
* *interface_details.friendly_name* - The friendly display name of the interface.

**from_webstore** - keyword, text.text

* *chrome_extensions.from_webstore* - True if this extension was installed from the web store

**fs_id** - keyword, text.text

* *quicklook_cache.fs_id* - Quicklook file fs_id key

**fsgid** - keyword

* *process_events.fsgid* - Filesystem group ID at process start
* *process_file_events.fsgid* - Filesystem group ID of the process using the file

**fsuid** - keyword

* *apparmor_events.fsuid* - Filesystem user ID
* *process_events.fsuid* - Filesystem user ID at process start
* *process_file_events.fsuid* - Filesystem user ID of the process using the file

**gateway** - keyword, text.text

* *docker_container_networks.gateway* - Gateway
* *docker_networks.gateway* - Network gateway
* *routes.gateway* - Route gateway

**gid** - keyword

* *asl.gid* - GID that sent the log message (set by the server).
* *bpf_process_events.gid* - Group ID
* *bpf_socket_events.gid* - Group ID
* *device_file.gid* - Owning group ID
* *docker_container_processes.gid* - Group ID
* *es_process_events.gid* - Group ID of the process
* *file.gid* - Owning group ID
* *file_events.gid* - Owning group ID
* *groups.gid* - Unsigned int64 group ID
* *kernel_keys.gid* - The group ID of the key.
* *package_bom.gid* - Expected group of file or directory
* *process_events.gid* - Group ID at process start
* *process_file_events.gid* - The gid of the process performing the action
* *processes.gid* - Unsigned group ID
* *seccomp_events.gid* - Group ID of the user who started the analyzed process
* *user_groups.gid* - Group ID
* *users.gid* - Group ID (unsigned)

**gid_signed** - keyword, number.long

* *groups.gid_signed* - A signed int64 version of gid
* *users.gid_signed* - Default group ID as int64 signed (Apple)

**git_commit** - keyword, text.text

* *docker_version.git_commit* - Docker build git commit

**global_seq_num** - keyword, number.long

* *es_process_events.global_seq_num* - Global sequence number
* *es_process_file_events.global_seq_num* - Global sequence number

**global_state** - keyword, number.long

* *alf.global_state* - 1 If the firewall is enabled with exceptions, 2 if the firewall is configured to block all incoming connections, else 0

**go_version** - keyword, text.text

* *docker_version.go_version* - Go version

**gpgcheck** - keyword, text.text

* *yum_sources.gpgcheck* - Whether packages are GPG checked

**gpgkey** - keyword, text.text

* *yum_sources.gpgkey* - URL to GPG key

**grace_period** - keyword, number.long

* *screenlock.grace_period* - The amount of time in seconds the screen must be asleep or the screensaver on before a password is required on-wake. 0 = immediately; -1 = no password is required on-wake

**group_sid** - keyword, text.text

* *groups.group_sid* - Unique group ID

**grouping** - keyword, text.text

* *windows_firewall_rules.grouping* - Group to which an individual rule belongs

**groupname** - keyword, text.text

* *groups.groupname* - Canonical local group name
* *launchd.groupname* - Run this daemon or agent as this group
* *rpm_package_files.groupname* - File default groupname from info DB
* *suid_bin.groupname* - Binary owner group

**guest** - keyword, number.long

* *cpu_time.guest* - Time spent running a virtual CPU for a guest OS under the control of the Linux kernel

**guest_nice** - keyword, number.long

* *cpu_time.guest_nice* - Time spent running a niced guest

**handle** - keyword, text.text

* *memory_array_mapped_addresses.handle* - Handle, or instance number, associated with the structure
* *memory_arrays.handle* - Handle, or instance number, associated with the array
* *memory_device_mapped_addresses.handle* - Handle, or instance number, associated with the structure
* *memory_devices.handle* - Handle, or instance number, associated with the structure in SMBIOS
* *memory_error_info.handle* - Handle, or instance number, associated with the structure
* *oem_strings.handle* - Handle, or instance number, associated with the Type 11 structure
* *smbios_tables.handle* - Table entry handle

**handle_count** - keyword, number.long

* *processes.handle_count* - Total number of handles that the process has open. This number is the sum of the handles currently opened by each thread in the process.

**handler** - keyword, text.text

* *app_schemes.handler* - Application label for the handler

**hard_limit** - keyword, text.text

* *ulimit_info.hard_limit* - Maximum limit value

**hard_links** - keyword, number.long

* *device_file.hard_links* - Number of hard links
* *file.hard_links* - Number of hard links

**hardware_model** - keyword, text.text

* *disk_info.hardware_model* - Hard drive model.
* *system_info.hardware_model* - Hardware model

**hardware_serial** - keyword, text.text

* *system_info.hardware_serial* - Device serial number

**hardware_vendor** - keyword, text.text

* *system_info.hardware_vendor* - Hardware vendor

**hardware_version** - keyword, text.text

* *system_info.hardware_version* - Hardware version

**has_expired** - keyword, number.long

* *curl_certificate.has_expired* - 1 if the certificate has expired, 0 otherwise

**hash** - keyword, text.text

* *prefetch.hash* - Prefetch CRC hash.

**hash_alg** - keyword, text.text

* *shadow.hash_alg* - Password hashing algorithm

**hash_executable** - keyword, number.long

* *signature.hash_executable* - Set to 1 to also hash the executable, or 0 otherwise. Default is 1

**hash_resources** - keyword, number.long

* *signature.hash_resources* - Set to 1 to also hash resources, or 0 otherwise. Default is 1

**hashed** - keyword, number.long

* *file_events.hashed* - 1 if the file was hashed, 0 if not, -1 if hashing failed

**header** - keyword, text.text

* *sudoers.header* - Symbol for given rule

**header_pid** - keyword, number.long

* *process_etw_events.header_pid* - Process ID of the process reporting the event

**header_size** - keyword, number.long

* *smbios_tables.header_size* - Header size in bytes

**health** - keyword, text.text

* *battery.health* - One of the following: "Good" describes a well-performing battery, "Fair" describes a functional battery with limited capacity, or "Poor" describes a battery that's not capable of providing power

**hidden** - keyword, number.long

* *scheduled_tasks.hidden* - Whether or not the task is visible in the UI
* *smc_keys.hidden* - 1 if this key is normally hidden, otherwise 0

**history_file** - keyword, text.text

* *shell_history.history_file* - Path to the .*_history for this user

**hit_count** - keyword, text.text

* *quicklook_cache.hit_count* - Number of cache hits on thumbnail

**home_directory** - keyword, text.text

* *logon_sessions.home_directory* - The home directory for the logon session.

**home_directory_drive** - keyword, text.text

* *logon_sessions.home_directory_drive* - The drive location of the home directory of the logon session.

**homepage** - keyword, text.text

* *npm_packages.homepage* - Package supplied homepage

**hop_limit** - keyword, number.long

* *interface_ipv6.hop_limit* - Current Hop Limit

**hopcount** - keyword, number.long

* *routes.hopcount* - Max hops expected

**host** - keyword, text.text

* *asl.host* - Sender's address (set by the server).
* *last.host* - Entry hostname
* *logged_in_users.host* - Remote hostname
* *preferences.host* - 'current' or 'any' host, where 'current' takes precedence
* *syslog_events.host* - Hostname configured for syslog

**host_ip** - keyword, text.text

* *docker_container_ports.host_ip* - Host IP address on which public port is listening

**host_port** - keyword, number.long

* *docker_container_ports.host_port* - Host port

**hostname** - keyword, text.text

* *curl_certificate.hostname* - Hostname to CURL (domain[:port], e.g. osquery.io)
* *system_info.hostname* - Network hostname including domain
* *ycloud_instance_metadata.hostname* - Hostname of the VM

**hostnames** - keyword, text.text

* *etc_hosts.hostnames* - Raw hosts mapping

**hotfix_id** - keyword, text.text

* *patches.hotfix_id* - The KB ID of the patch.

**hour** - keyword, text.text

* *crontab.hour* - The hour of the day for the job
* *time.hour* - Current hour in UTC

**hours** - keyword, number.long

* *uptime.hours* - Hours of uptime

**hresult** - keyword, number.long

* *windows_update_history.hresult* - HRESULT value that is returned from the operation on an update

**http_proxy** - keyword, text.text

* *docker_info.http_proxy* - HTTP proxy

**https_proxy** - keyword, text.text

* *docker_info.https_proxy* - HTTPS proxy

**hwaddr** - keyword, text.text

* *lxd_networks.hwaddr* - Hardware address for this network

**iam_arn** - keyword, text.text

* *ec2_instance_metadata.iam_arn* - If there is an IAM role associated with the instance, contains instance profile ARN

**ibrs_support_enabled** - keyword, number.long

* *kva_speculative_info.ibrs_support_enabled* - Windows uses IBRS.

**ibytes** - keyword, number.long

* *interface_details.ibytes* - Input bytes

**icmp_types_codes** - keyword, text.text

* *windows_firewall_rules.icmp_types_codes* - ICMP types and codes for the rule

**icon_mode** - keyword, number.long

* *quicklook_cache.icon_mode* - Thumbnail icon mode

**id** - keyword, text.text

* *disk_info.id* - The unique identifier of the drive on the system.
* *dns_resolvers.id* - Address type index or order
* *docker_container_envs.id* - Container ID
* *docker_container_fs_changes.id* - Container ID
* *docker_container_labels.id* - Container ID
* *docker_container_mounts.id* - Container ID
* *docker_container_networks.id* - Container ID
* *docker_container_ports.id* - Container ID
* *docker_container_processes.id* - Container ID
* *docker_container_stats.id* - Container ID
* *docker_containers.id* - Container ID
* *docker_image_history.id* - Image ID
* *docker_image_labels.id* - Image ID
* *docker_image_layers.id* - Image ID
* *docker_images.id* - Image ID
* *docker_info.id* - Docker system ID
* *docker_network_labels.id* - Network ID
* *docker_networks.id* - Network ID
* *iokit_devicetree.id* - IOKit internal registry ID
* *iokit_registry.id* - IOKit internal registry ID
* *lxd_images.id* - Image ID
* *systemd_units.id* - Unique unit identifier

**identifier** - keyword, text.text

* *browser_plugins.identifier* - Plugin identifier
* *chrome_extension_content_scripts.identifier* - Extension identifier
* *chrome_extensions.identifier* - Extension identifier, computed from its manifest. Empty in case of error.
* *crashes.identifier* - Identifier of the crashed process
* *firefox_addons.identifier* - Addon identifier
* *safari_extensions.identifier* - Extension identifier
* *signature.identifier* - The signing identifier sealed into the signature
* *system_extensions.identifier* - Identifier name
* *xprotect_meta.identifier* - Browser plugin or extension identifier

**identifying_number** - keyword, text.text

* *programs.identifying_number* - Product identification such as a serial number on software, or a die number on a hardware chip.

**identity** - keyword, text.text

* *xprotect_entries.identity* - XProtect identity (SHA1) of content

**idle** - keyword, number.long

* *cpu_time.idle* - Time spent in the idle task

**idrops** - keyword, number.long

* *interface_details.idrops* - Input drops

**idx** - keyword, number.long

* *kernel_extensions.idx* - Extension load tag or index

**ierrors** - keyword, number.long

* *interface_details.ierrors* - Input errors

**image** - keyword, text.text

* *docker_containers.image* - Docker image (name) used to launch this container
* *drivers.image* - Path to driver image file

**image_id** - keyword, text.text

* *docker_containers.image_id* - Docker image ID

**images** - keyword, number.long

* *docker_info.images* - Number of images

**inactive** - keyword, number.long

* *memory_info.inactive* - The total amount of buffer or page cache memory, in bytes, that are free and available
* *shadow.inactive* - Number of days after password expires until account is blocked
* *virtual_memory_info.inactive* - Total number of inactive pages.

**include_remote** - keyword, number.long

* *users.include_remote* - 1 to include remote (LDAP/AD) accounts (default 0). Warning: without any uid/username filtering it may list whole LDAP directories

**inetd_compatibility** - keyword, text.text

* *launchd.inetd_compatibility* - Run this daemon or agent as it was launched from inetd

**inf** - keyword, text.text

* *drivers.inf* - Associated inf file

**info** - keyword, text.text

* *apparmor_events.info* - Additional information

**info_access** - keyword, text.text

* *curl_certificate.info_access* - Authority Information Access

**info_string** - keyword, text.text

* *apps.info_string* - Info properties CFBundleGetInfoString label

**inherited_from** - keyword, text.text

* *ntfs_acl_permissions.inherited_from* - The inheritance policy of the ACE.

**iniface** - keyword, text.text

* *iptables.iniface* - Input interface for the rule.

**iniface_mask** - keyword, text.text

* *iptables.iniface_mask* - Input interface mask for the rule.

**inode** - keyword, number.long

* *device_file.inode* - Filesystem inode number
* *device_hash.inode* - Filesystem inode number
* *file.inode* - Filesystem inode number
* *file_events.inode* - Filesystem inode number
* *process_memory_map.inode* - Mapped path inode, 0 means uninitialized (BSS)
* *process_open_pipes.inode* - Pipe inode number
* *quicklook_cache.inode* - Parsed file ID (inode) from fs_id

**inodes** - keyword, number.long

* *device_partitions.inodes* - Number of meta nodes
* *mounts.inodes* - Mounted device used inodes

**inodes_free** - keyword, number.long

* *mounts.inodes_free* - Mounted device free inodes

**inodes_total** - keyword, number.long

* *lxd_storage_pools.inodes_total* - Total number of inodes available in this storage pool

**inodes_used** - keyword, number.long

* *lxd_storage_pools.inodes_used* - Number of inodes used

**input_eax** - keyword, text.text

* *cpuid.input_eax* - Value of EAX used

**install_date** - keyword

* *os_version.install_date* - The install date of the OS.
* *patches.install_date* - Indicates when the patch was installed. Lack of a value does not indicate that the patch was not installed.
* *programs.install_date* - Date that this product was installed on the system.
* *shared_resources.install_date* - Indicates when the object was installed. Lack of a value does not indicate that the object is not installed.

**install_location** - keyword, text.text

* *programs.install_location* - The installation location directory of the product.

**install_source** - keyword, text.text

* *programs.install_source* - The installation source of the product.

**install_time** - keyword

* *appcompat_shims.install_time* - Install time of the SDB
* *chrome_extensions.install_time* - Extension install time, in its original Webkit format
* *package_receipts.install_time* - Timestamp of install time
* *rpm_packages.install_time* - When the package was installed

**install_timestamp** - keyword, number.long

* *chrome_extensions.install_timestamp* - Extension install time, converted to unix time

**installed_at** - keyword, number.long

* *vscode_extensions.installed_at* - Installed Timestamp

**installed_by** - keyword, text.text

* *patches.installed_by* - The system context in which the patch as installed.

**installed_on** - keyword, text.text

* *patches.installed_on* - The date when the patch was installed.

**installer_name** - keyword, text.text

* *package_receipts.installer_name* - Name of installer process

**instance_id** - keyword, text.text

* *ec2_instance_metadata.instance_id* - EC2 instance ID
* *ec2_instance_tags.instance_id* - EC2 instance ID
* *osquery_info.instance_id* - Unique, long-lived ID per instance of osquery
* *ycloud_instance_metadata.instance_id* - Unique identifier for the VM

**instance_identifier** - keyword, text.text

* *deviceguard_status.instance_identifier* - The instance ID of Device Guard.

**instance_type** - keyword, text.text

* *ec2_instance_metadata.instance_type* - EC2 instance type

**instances** - keyword, number.long

* *pipes.instances* - Number of instances of the named pipe

**interface** - keyword, text.text

* *arp_cache.interface* - Interface of the network for the MAC
* *interface_addresses.interface* - Interface name
* *interface_details.interface* - Interface name
* *interface_ipv6.interface* - Interface name
* *routes.interface* - Route local interface
* *wifi_status.interface* - Name of the interface
* *wifi_survey.interface* - Name of the interface

**interleave_data_depth** - keyword, number.long

* *memory_device_mapped_addresses.interleave_data_depth* - The max number of consecutive rows from memory device that are accessed in a single interleave transfer; 0 indicates device is non-interleave

**interleave_position** - keyword, number.long

* *memory_device_mapped_addresses.interleave_position* - The position of the device in a interleave, i.e. 0 indicates non-interleave, 1 indicates 1st interleave, 2 indicates 2nd interleave, etc.

**internal** - keyword, number.long

* *osquery_registry.internal* - 1 If the plugin is internal else 0

**internet_settings** - keyword, text.text

* *windows_security_center.internet_settings* - The health of the Internet Settings

**internet_sharing** - keyword, number.long

* *sharing_preferences.internet_sharing* - 1 If internet sharing is enabled else 0

**interval** - keyword, number.long

* *docker_container_stats.interval* - Difference between read and preread in nano-seconds
* *osquery_schedule.interval* - The interval in seconds to run this query, not an exact interval

**iowait** - keyword, number.long

* *cpu_time.iowait* - Time spent waiting for I/O to complete

**ip** - keyword, text.text

* *seccomp_events.ip* - Instruction pointer value

**ip_address** - keyword, text.text

* *docker_container_networks.ip_address* - IP address

**ip_prefix_len** - keyword, number.long

* *docker_container_networks.ip_prefix_len* - IP subnet prefix length

**ipackets** - keyword, number.long

* *interface_details.ipackets* - Input packets

**ipc_namespace** - keyword, text.text

* *docker_containers.ipc_namespace* - IPC namespace
* *process_namespaces.ipc_namespace* - ipc namespace inode

**ipv4_address** - keyword, text.text

* *lxd_networks.ipv4_address* - IPv4 address

**ipv4_forwarding** - keyword, number.long

* *docker_info.ipv4_forwarding* - 1 if IPv4 forwarding is enabled. 0 otherwise

**ipv4_internet** - keyword, number.long

* *connectivity.ipv4_internet* - True if any interface is connected to the Internet via IPv4

**ipv4_local_network** - keyword, number.long

* *connectivity.ipv4_local_network* - True if any interface is connected to a routed network via IPv4

**ipv4_no_traffic** - keyword, number.long

* *connectivity.ipv4_no_traffic* - True if any interface is connected via IPv4, but has seen no traffic

**ipv4_subnet** - keyword, number.long

* *connectivity.ipv4_subnet* - True if any interface is connected to the local subnet via IPv4

**ipv6_address** - keyword, text.text

* *docker_container_networks.ipv6_address* - IPv6 address
* *lxd_networks.ipv6_address* - IPv6 address

**ipv6_gateway** - keyword, text.text

* *docker_container_networks.ipv6_gateway* - IPv6 gateway

**ipv6_internet** - keyword, number.long

* *connectivity.ipv6_internet* - True if any interface is connected to the Internet via IPv6

**ipv6_local_network** - keyword, number.long

* *connectivity.ipv6_local_network* - True if any interface is connected to a routed network via IPv6

**ipv6_no_traffic** - keyword, number.long

* *connectivity.ipv6_no_traffic* - True if any interface is connected via IPv6, but has seen no traffic

**ipv6_prefix_len** - keyword, number.long

* *docker_container_networks.ipv6_prefix_len* - IPv6 subnet prefix length

**ipv6_subnet** - keyword, number.long

* *connectivity.ipv6_subnet* - True if any interface is connected to the local subnet via IPv6

**irq** - keyword, number.long

* *cpu_time.irq* - Time spent servicing interrupts

**is_active** - keyword, number.long

* *running_apps.is_active* - (DEPRECATED)

**is_hidden** - keyword, number.long

* *groups.is_hidden* - IsHidden attribute set in OpenDirectory
* *users.is_hidden* - IsHidden attribute set in OpenDirectory

**iso_8601** - keyword, text.text

* *time.iso_8601* - Current time (ISO format) in UTC

**issuer** - keyword, text.text

* *certificates.issuer* - Certificate issuer distinguished name (deprecated, use issuer2)

**issuer2** - keyword, text.text

* *certificates.issuer2* - Certificate issuer distinguished name

**issuer_alternative_names** - keyword, text.text

* *curl_certificate.issuer_alternative_names* - Issuer Alternative Name

**issuer_common_name** - keyword, text.text

* *curl_certificate.issuer_common_name* - Issuer common name

**issuer_name** - keyword, text.text

* *authenticode.issuer_name* - The certificate issuer name

**issuer_organization** - keyword, text.text

* *curl_certificate.issuer_organization* - Issuer organization

**issuer_organization_unit** - keyword, text.text

* *curl_certificate.issuer_organization_unit* - Issuer organization unit

**job_id** - keyword, number.long

* *systemd_units.job_id* - Next queued job id

**job_path** - keyword, text.text

* *systemd_units.job_path* - The object path for the job

**job_type** - keyword, text.text

* *systemd_units.job_type* - Job type

**json_cmdline** - keyword, text.text

* *bpf_process_events.json_cmdline* - Command line arguments, in JSON format

**keep_alive** - keyword, text.text

* *launchd.keep_alive* - Should the process be restarted if killed

**kernel_extensions** - keyword, number.long

* *secureboot.kernel_extensions* - (Apple Silicon) Allow user management of kernel extensions from identified developers (1 if allowed)

**kernel_memory** - keyword, number.long

* *docker_info.kernel_memory* - 1 if kernel memory limit support is enabled. 0 otherwise

**kernel_version** - keyword, text.text

* *docker_info.kernel_version* - Kernel version
* *docker_version.kernel_version* - Kernel version
* *kernel_panics.kernel_version* - Version of the system kernel

**key** - keyword, text.text

* *authorized_keys.key* - Key encoded as base64
* *azure_instance_tags.key* - The tag key
* *chrome_extensions.key* - The extension key, from the manifest file
* *docker_container_envs.key* - Environment variable name
* *docker_container_labels.key* - Label key
* *docker_image_labels.key* - Label key
* *docker_network_labels.key* - Label key
* *docker_volume_labels.key* - Label key
* *ec2_instance_tags.key* - Tag key
* *extended_attributes.key* - Name of the value generated from the extended attribute
* *known_hosts.key* - parsed authorized keys line
* *launchd_overrides.key* - Name of the override key
* *lxd_instance_config.key* - Configuration parameter name
* *lxd_instance_devices.key* - Device info param name
* *mdls.key* - Name of the metadata key
* *plist.key* - Preference top-level key
* *power_sensors.key* - The SMC key on macOS
* *preferences.key* - Preference top-level key
* *process_envs.key* - Environment variable name
* *registry.key* - Name of the key to search for
* *selinux_settings.key* - Key or class name.
* *smc_keys.key* - 4-character key
* *temperature_sensors.key* - The SMC key on macOS

**key_algorithm** - keyword, text.text

* *certificates.key_algorithm* - Key algorithm used

**key_file** - keyword, text.text

* *authorized_keys.key_file* - Path to the authorized_keys file
* *known_hosts.key_file* - Path to known_hosts file

**key_group_name** - keyword, text.text

* *user_ssh_keys.key_group_name* - The group of the private key. Supported for a subset of key_types implemented by OpenSSL

**key_length** - keyword, number.long

* *user_ssh_keys.key_length* - The cryptographic length of the cryptosystem to which the private key belongs, in bits. Definition of cryptographic length is specific to cryptosystem. -1 if unavailable

**key_security_bits** - keyword, number.long

* *user_ssh_keys.key_security_bits* - The number of security bits of the private key, bits of security as defined in NIST SP800-57. -1 if unavailable

**key_strength** - keyword, text.text

* *certificates.key_strength* - Key size used for RSA/DSA, or curve name

**key_type** - keyword, text.text

* *user_ssh_keys.key_type* - The type of the private key. One of [rsa, dsa, dh, ec, hmac, cmac], or the empty string.

**key_usage** - keyword, text.text

* *certificates.key_usage* - Certificate key usage and extended key usage
* *curl_certificate.key_usage* - Usage of key in certificate

**keychain_path** - keyword, text.text

* *keychain_acls.keychain_path* - The path of the keychain

**keyword** - keyword, text.text

* *portage_keywords.keyword* - The keyword applied to the package

**keywords** - keyword, text.text

* *windows_eventlog.keywords* - A bitmask of the keywords defined in the event
* *windows_events.keywords* - A bitmask of the keywords defined in the event

**kva_shadow_enabled** - keyword, number.long

* *kva_speculative_info.kva_shadow_enabled* - Kernel Virtual Address shadowing is enabled.

**kva_shadow_inv_pcid** - keyword, number.long

* *kva_speculative_info.kva_shadow_inv_pcid* - Kernel VA INVPCID is enabled.

**kva_shadow_pcid** - keyword, number.long

* *kva_speculative_info.kva_shadow_pcid* - Kernel VA PCID flushing optimization is enabled.

**kva_shadow_user_global** - keyword, number.long

* *kva_speculative_info.kva_shadow_user_global* - User pages are marked as global.

**label** - keyword, text.text

* *apparmor_events.label* - AppArmor label
* *augeas.label* - The label of the configuration item
* *authorization_mechanisms.label* - Label of the authorization right
* *authorizations.label* - Item name, usually in reverse domain format
* *block_devices.label* - Block device label string
* *device_partitions.label* - The partition name as stored in the partition table
* *keychain_acls.label* - An optional label tag that may be included with the keychain entry
* *keychain_items.label* - Generic item name
* *launchd.label* - Daemon or agent service name
* *launchd_overrides.label* - Daemon or agent service name
* *quicklook_cache.label* - Parsed version 'gen' field
* *sandboxes.label* - UTI-format bundle or label ID

**language** - keyword, text.text

* *programs.language* - The language of the product.

**last_change** - keyword, number.long

* *interface_details.last_change* - Time of last device modification (optional)
* *shadow.last_change* - Date of last password change (starting from UNIX epoch date)

**last_connected** - keyword, number.long

* *wifi_networks.last_connected* - Last time this network was connected to as a unix_time

**last_executed** - keyword, number.long

* *osquery_schedule.last_executed* - UNIX time stamp in seconds of the last completed execution

**last_execution_time** - keyword, number.long

* *background_activities_moderator.last_execution_time* - Most recent time application was executed.
* *userassist.last_execution_time* - Most recent time application was executed.

**last_hit_date** - keyword, number.long

* *quicklook_cache.last_hit_date* - Apple date format for last thumbnail cache hit

**last_loaded** - keyword, text.text

* *kernel_panics.last_loaded* - Last loaded module before panic

**last_memory** - keyword, number.long

* *osquery_schedule.last_memory* - Resident memory in bytes left allocated after collecting results of the latest execution

**last_opened_time** - keyword

* *apps.last_opened_time* - The time that the app was last used
* *office_mru.last_opened_time* - Most recent opened time file was opened

**last_run_code** - keyword, text.text

* *scheduled_tasks.last_run_code* - Exit status code of the last task run

**last_run_message** - keyword, text.text

* *scheduled_tasks.last_run_message* - Exit status message of the last task run

**last_run_time** - keyword, number.long

* *prefetch.last_run_time* - Most recent time application was run.
* *scheduled_tasks.last_run_time* - Timestamp the task last ran

**last_system_time** - keyword, number.long

* *osquery_schedule.last_system_time* - System time in milliseconds of the latest execution

**last_unloaded** - keyword, text.text

* *kernel_panics.last_unloaded* - Last unloaded module before panic

**last_used_at** - keyword, text.text

* *lxd_images.last_used_at* - ISO time for the most recent use of this image in terms of container spawn

**last_user_time** - keyword, number.long

* *osquery_schedule.last_user_time* - User time in milliseconds of the latest execution

**last_wall_time_ms** - keyword, number.long

* *osquery_schedule.last_wall_time_ms* - Wall time in milliseconds of the latest execution

**launch_type** - keyword, text.text

* *xprotect_entries.launch_type* - Launch services content type

**layer_id** - keyword, text.text

* *docker_image_layers.layer_id* - Layer ID

**layer_order** - keyword, number.long

* *docker_image_layers.layer_order* - Layer Order (1 = base layer)

**level** - keyword

* *asl.level* - Log level number.  See levels in asl.h.
* *unified_log.level* - the severity level of the entry
* *windows_eventlog.level* - Severity level associated with the event
* *windows_events.level* - The severity level associated with the event

**license** - keyword, text.text

* *chocolatey_packages.license* - License under which package is launched
* *npm_packages.license* - License under which package is launched
* *python_packages.license* - License under which package is launched

**link_speed** - keyword, number.long

* *interface_details.link_speed* - Interface speed in Mb/s

**linked_against** - keyword, text.text

* *kernel_extensions.linked_against* - Indexes of extensions this extension is linked against

**load_percentage** - keyword, number.long

* *cpu_info.load_percentage* - The current percentage of utilization of the CPU.

**load_state** - keyword, text.text

* *systemd_units.load_state* - Reflects whether the unit definition was properly loaded

**local_address** - keyword, text.text

* *bpf_socket_events.local_address* - Local address associated with socket
* *process_open_sockets.local_address* - Socket local address
* *socket_events.local_address* - Local address associated with socket

**local_addresses** - keyword, text.text

* *windows_firewall_rules.local_addresses* - Local addresses for the rule

**local_hostname** - keyword, text.text

* *ec2_instance_metadata.local_hostname* - Private IPv4 DNS hostname of the first interface of this instance
* *system_info.local_hostname* - Local hostname (optional)

**local_ipv4** - keyword, text.text

* *ec2_instance_metadata.local_ipv4* - Private IPv4 address of the first interface of this instance

**local_port** - keyword, number.long

* *bpf_socket_events.local_port* - Local network protocol port number
* *process_open_sockets.local_port* - Socket local port
* *socket_events.local_port* - Local network protocol port number

**local_ports** - keyword, text.text

* *windows_firewall_rules.local_ports* - Local ports for the rule

**local_timezone** - keyword, text.text

* *time.local_timezone* - Current local timezone in of the system

**location** - keyword, text.text

* *azure_instance_metadata.location* - Azure Region the VM is running in
* *firefox_addons.location* - Global, profile location
* *memory_arrays.location* - Physical location of the memory array
* *package_receipts.location* - Optional relative install path on volume

**lock** - keyword, text.text

* *chassis_info.lock* - If TRUE, the frame is equipped with a lock.

**lock_status** - keyword, number.long

* *bitlocker_info.lock_status* - The accessibility status of the drive from Windows.

**locked** - keyword, number.long

* *shared_memory.locked* - 1 if segment is locked else 0

**lockout_bad_count** - keyword, number.long

* *security_profile_info.lockout_bad_count* - Number of failed logon attempts after which a user account MUST be locked out

**log_file_disk_quota_mb** - keyword, number.long

* *carbon_black_info.log_file_disk_quota_mb* - Event file disk quota in MB

**log_file_disk_quota_percentage** - keyword, number.long

* *carbon_black_info.log_file_disk_quota_percentage* - Event file disk quota in a percentage

**logging_driver** - keyword, text.text

* *docker_info.logging_driver* - Logging driver

**logging_enabled** - keyword, number.long

* *alf.logging_enabled* - 1 If logging mode is enabled else 0

**logging_option** - keyword, number.long

* *alf.logging_option* - Firewall logging option (not supported on macOS 15+)

**logical_processors** - keyword, number.long

* *cpu_info.logical_processors* - The number of logical processors of the CPU.

**logon_domain** - keyword, text.text

* *logon_sessions.logon_domain* - The name of the domain used to authenticate the owner of the logon session.

**logon_id** - keyword, number.long

* *logon_sessions.logon_id* - A locally unique identifier (LUID) that identifies a logon session.

**logon_script** - keyword, text.text

* *logon_sessions.logon_script* - The script used for logging on.

**logon_server** - keyword, text.text

* *logon_sessions.logon_server* - The name of the server used to authenticate the owner of the logon session.

**logon_sid** - keyword, text.text

* *logon_sessions.logon_sid* - The user's security identifier (SID).

**logon_time** - keyword, number.long

* *logon_sessions.logon_time* - The time the session owner logged on.

**logon_to_change_password** - keyword, number.long

* *security_profile_info.logon_to_change_password* - Determines if logon session is required to change the password

**logon_type** - keyword, text.text

* *logon_sessions.logon_type* - The logon method.

**lsa_anonymous_name_lookup** - keyword, number.long

* *security_profile_info.lsa_anonymous_name_lookup* - Determines if an anonymous user is allowed to query the local LSA policy

**mac** - keyword, text.text

* *arp_cache.mac* - MAC address of broadcasted address
* *ec2_instance_metadata.mac* - MAC address for the first network interface of this EC2 instance
* *interface_details.mac* - MAC of interface (optional)

**mac_address** - keyword, text.text

* *docker_container_networks.mac_address* - MAC address

**machine_name** - keyword, text.text

* *windows_crashes.machine_name* - Name of the machine where the crash happened

**magic_db_files** - keyword, text.text

* *magic.magic_db_files* - Colon(:) separated list of files where the magic db file can be found. By default one of the following is used: /usr/share/file/magic/magic, /usr/share/misc/magic or /usr/share/misc/magic.mgc

**main** - keyword, number.long

* *connected_displays.main* - If the display is the main display.

**maintainer** - keyword, text.text

* *apt_sources.maintainer* - Repository maintainer
* *deb_packages.maintainer* - Package maintainer

**major** - keyword, number.long

* *os_version.major* - Major release version

**major_version** - keyword, number.long

* *windows_crashes.major_version* - Windows major version of the machine

**managed** - keyword, number.long

* *lxd_networks.managed* - 1 if network created by LXD, 0 otherwise

**mandatory_label** - keyword, text.text

* *process_etw_events.mandatory_label* - Primary token mandatory label sid - Present only on ProcessStart events

**manifest_hash** - keyword, text.text

* *chrome_extensions.manifest_hash* - The SHA256 hash of the manifest.json file

**manifest_json** - keyword, text.text

* *chrome_extensions.manifest_json* - The manifest file of the extension

**manual** - keyword, number.long

* *managed_policies.manual* - 1 if policy was loaded manually, otherwise 0

**manufacture_date** - keyword, number.long

* *battery.manufacture_date* - The date the battery was manufactured UNIX Epoch

**manufactured_week** - keyword, number.long

* *connected_displays.manufactured_week* - The manufacture week of the display. This field is 0 if not supported

**manufactured_year** - keyword, number.long

* *connected_displays.manufactured_year* - The manufacture year of the display. This field is 0 if not supported

**manufacturer** - keyword, text.text

* *battery.manufacturer* - The battery manufacturer's name
* *chassis_info.manufacturer* - The manufacturer of the chassis.
* *cpu_info.manufacturer* - The manufacturer of the CPU.
* *disk_info.manufacturer* - The manufacturer of the disk.
* *drivers.manufacturer* - Device manufacturer
* *interface_details.manufacturer* - Name of the network adapter's manufacturer.
* *memory_devices.manufacturer* - Manufacturer ID string
* *video_info.manufacturer* - The manufacturer of the gpu.

**manufacturer_id** - keyword, number.long

* *tpm_info.manufacturer_id* - TPM manufacturers ID

**manufacturer_name** - keyword, text.text

* *tpm_info.manufacturer_name* - TPM manufacturers name

**manufacturer_version** - keyword, text.text

* *tpm_info.manufacturer_version* - TPM version

**mask** - keyword, text.text

* *interface_addresses.mask* - Interface netmask
* *portage_keywords.mask* - If the package is masked

**match** - keyword, text.text

* *chrome_extension_content_scripts.match* - The pattern that the script is matched against
* *iptables.match* - Matching rule that applies.

**matches** - keyword, text.text

* *yara.matches* - List of YARA matches
* *yara_events.matches* - List of YARA matches

**max** - keyword, number.long

* *fan_speed_sensors.max* - Maximum speed
* *shadow.max* - Maximum number of days between password changes

**max_capacity** - keyword, number.long

* *battery.max_capacity* - The battery's actual capacity when it is fully charged in mAh
* *memory_arrays.max_capacity* - Maximum capacity of array in gigabytes

**max_clock_speed** - keyword, number.long

* *cpu_info.max_clock_speed* - The maximum possible frequency of the CPU.

**max_instances** - keyword, number.long

* *pipes.max_instances* - The maximum number of instances creatable for this pipe

**max_results** - keyword, number.long

* *windows_search.max_results* - Maximum number of results returned by windows api, set to -1 for unlimited

**max_rows** - keyword, number.long

* *unified_log.max_rows* - the max number of rows returned (defaults to 100)

**max_speed** - keyword, number.long

* *memory_devices.max_speed* - Max speed of memory device in megatransfers per second (MT/s)

**max_voltage** - keyword, number.long

* *memory_devices.max_voltage* - Maximum operating voltage of device in millivolts

**maximum_allowed** - keyword, number.long

* *shared_resources.maximum_allowed* - Limit on the maximum number of users allowed to use this resource concurrently. The value is only valid if the AllowMaximum property is set to FALSE.

**maximum_password_age** - keyword, number.long

* *security_profile_info.maximum_password_age* - Determines the maximum number of days that a password can be used before the client requires the user to change it

**md5** - keyword, text.text

* *acpi_tables.md5* - MD5 hash of table content
* *device_hash.md5* - MD5 hash of provided inode data
* *file_events.md5* - The MD5 of the file after change
* *hash.md5* - MD5 hash of provided filesystem data
* *smbios_tables.md5* - MD5 hash of table entry

**md_device_name** - keyword, text.text

* *md_drives.md_device_name* - md device name

**mdm_managed** - keyword, number.long

* *system_extensions.mdm_managed* - 1 if managed by MDM system extension payload configuration, 0 otherwise

**mdm_operations** - keyword, number.long

* *secureboot.mdm_operations* - (Apple Silicon) Allow remote (MDM) management of kernel extensions and automatic software updates (1 if allowed)

**mechanism** - keyword, text.text

* *authorization_mechanisms.mechanism* - Name of the mechanism that will be called

**media_name** - keyword, text.text

* *disk_events.media_name* - Disk event media name string

**mem** - keyword, number.double

* *docker_container_processes.mem* - Memory utilization as percentage

**member_config_description** - keyword, text.text

* *lxd_cluster.member_config_description* - Config description

**member_config_entity** - keyword, text.text

* *lxd_cluster.member_config_entity* - Type of configuration parameter for this node

**member_config_key** - keyword, text.text

* *lxd_cluster.member_config_key* - Config key

**member_config_name** - keyword, text.text

* *lxd_cluster.member_config_name* - Name of configuration parameter

**member_config_value** - keyword, text.text

* *lxd_cluster.member_config_value* - Config value

**memory** - keyword, number.long

* *docker_info.memory* - Total memory

**memory_array_error_address** - keyword, text.text

* *memory_error_info.memory_array_error_address* - 32 bit physical address of the error based on the addressing of the bus to which the memory array is connected

**memory_array_handle** - keyword, text.text

* *memory_array_mapped_addresses.memory_array_handle* - Handle of the memory array associated with this structure

**memory_array_mapped_address_handle** - keyword, text.text

* *memory_device_mapped_addresses.memory_array_mapped_address_handle* - Handle of the memory array mapped address to which this device range is mapped to

**memory_available** - keyword, number.long

* *memory_info.memory_available* - The amount of physical RAM, in bytes, available for starting new applications, without swapping

**memory_cached** - keyword, number.long

* *docker_container_stats.memory_cached* - Memory cached

**memory_device_handle** - keyword, text.text

* *memory_device_mapped_addresses.memory_device_handle* - Handle of the memory device structure associated with this structure

**memory_error_correction** - keyword, text.text

* *memory_arrays.memory_error_correction* - Primary hardware error correction or detection method supported

**memory_error_info_handle** - keyword, text.text

* *memory_arrays.memory_error_info_handle* - Handle, or instance number, associated with any error that was detected for the array

**memory_free** - keyword, number.long

* *memory_info.memory_free* - The amount of physical RAM, in bytes, left unused by the system

**memory_limit** - keyword, number.long

* *docker_container_stats.memory_limit* - Memory limit
* *docker_info.memory_limit* - 1 if memory limit support is enabled. 0 otherwise

**memory_max_usage** - keyword, number.long

* *docker_container_stats.memory_max_usage* - Memory maximum usage

**memory_total** - keyword, number.long

* *memory_info.memory_total* - Total amount of physical RAM, in bytes

**memory_type** - keyword, text.text

* *memory_devices.memory_type* - Type of memory used

**memory_type_details** - keyword, text.text

* *memory_devices.memory_type_details* - Additional details for memory device

**memory_usage** - keyword, number.long

* *docker_container_stats.memory_usage* - Memory usage

**message** - keyword, text.text

* *apparmor_events.message* - Raw audit message
* *asl.message* - Message text.
* *lxd_cluster_members.message* - Message from the node (Online/Offline)
* *selinux_events.message* - Message
* *syslog_events.message* - The syslog message
* *unified_log.message* - composed message
* *user_events.message* - Message from the event

**metadata_endpoint** - keyword, text.text

* *ycloud_instance_metadata.metadata_endpoint* - Endpoint used to fetch VM metadata

**metalink** - keyword, text.text

* *yum_sources.metalink* - Metalink URL

**method** - keyword, text.text

* *curl.method* - The HTTP method for the request

**metric** - keyword, number.long

* *interface_details.metric* - Metric based on the speed of the interface
* *routes.metric* - Cost of route. Lowest is preferred

**metric_name** - keyword, text.text

* *prometheus_metrics.metric_name* - Name of collected Prometheus metric

**metric_value** - keyword, number.double

* *prometheus_metrics.metric_value* - Value of collected Prometheus metric

**mft_entry** - keyword, number.long

* *shellbags.mft_entry* - Directory master file table entry.

**mft_sequence** - keyword, number.long

* *shellbags.mft_sequence* - Directory master file table sequence.

**mime_encoding** - keyword, text.text

* *magic.mime_encoding* - MIME encoding data from libmagic

**mime_type** - keyword, text.text

* *magic.mime_type* - MIME type data from libmagic

**min** - keyword, number.long

* *fan_speed_sensors.min* - Minimum speed
* *shadow.min* - Minimal number of days between password changes

**min_api_version** - keyword, text.text

* *docker_version.min_api_version* - Minimum API version supported

**min_version** - keyword, text.text

* *xprotect_meta.min_version* - The minimum allowed plugin version.

**min_voltage** - keyword, number.long

* *memory_devices.min_voltage* - Minimum operating voltage of device in millivolts

**minimum_password_age** - keyword, number.long

* *security_profile_info.minimum_password_age* - Determines the minimum number of days that a password must be used before the user can change it

**minimum_password_length** - keyword, number.long

* *security_profile_info.minimum_password_length* - Determines the least number of characters that can make up a password for a user account

**minimum_system_version** - keyword, text.text

* *apps.minimum_system_version* - Minimum version of macOS required for the app to run

**minor** - keyword, number.long

* *os_version.minor* - Minor release version

**minor_version** - keyword, number.long

* *windows_crashes.minor_version* - Windows minor version of the machine

**minute** - keyword, text.text

* *crontab.minute* - The exact minute for the job

**minutes** - keyword, number.long

* *time.minutes* - Current minutes in UTC
* *uptime.minutes* - Minutes of uptime

**minutes_to_full_charge** - keyword, number.long

* *battery.minutes_to_full_charge* - The number of minutes until the battery is fully charged. This value is -1 if this time is still being calculated. On Windows this is calculated from the charge rate and capacity and may not agree with the number reported in "Power & Battery"

**minutes_until_empty** - keyword, number.long

* *battery.minutes_until_empty* - The number of minutes until the battery is fully depleted. This value is -1 if this time is still being calculated

**mirror** - keyword, number.long

* *connected_displays.mirror* - If the display is mirrored or not. This field is 1 if mirrored and 0 if not mirrored.

**mirrorlist** - keyword, text.text

* *yum_sources.mirrorlist* - Mirrorlist URL

**mnt_namespace** - keyword, text.text

* *docker_containers.mnt_namespace* - Mount namespace
* *process_namespaces.mnt_namespace* - mnt namespace inode

**mode** - keyword, text.text

* *apparmor_profiles.mode* - How the policy is applied.
* *device_file.mode* - Permission bits
* *docker_container_mounts.mode* - Mount options (rw, ro)
* *file.mode* - Permission bits
* *file_events.mode* - Permission bits
* *package_bom.mode* - Expected permissions
* *process_events.mode* - File mode permissions
* *process_open_pipes.mode* - Pipe open mode (r/w)
* *rpm_package_files.mode* - File permissions mode from info DB
* *wifi_status.mode* - The current operating mode for the Wi-Fi interface

**model** - keyword, text.text

* *battery.model* - The battery's model number
* *block_devices.model* - Block device model string identifier
* *chassis_info.model* - The model of the chassis.
* *cpu_info.model* - The model of the CPU.
* *hardware_events.model* - Hardware device model
* *pci_devices.model* - PCI Device model
* *usb_devices.model* - USB Device model string
* *video_info.model* - The model of the gpu.

**model_id** - keyword, text.text

* *hardware_events.model_id* - Hex encoded Hardware model identifier
* *pci_devices.model_id* - Hex encoded PCI Device model identifier
* *usb_devices.model_id* - Hex encoded USB Device model identifier

**modified** - keyword, text.text

* *authorizations.modified* - Label top-level key
* *keychain_items.modified* - Date of last modification

**modified_time** - keyword, number.long

* *package_bom.modified_time* - Timestamp the file was installed
* *shellbags.modified_time* - Directory Modified time.
* *shimcache.modified_time* - File Modified time.

**module** - keyword, text.text

* *windows_crashes.module* - Path of the crashed module within the process

**module_backtrace** - keyword, text.text

* *kernel_panics.module_backtrace* - Modules appearing in the crashed module's backtrace

**module_path** - keyword, text.text

* *services.module_path* - Path to ServiceDll

**month** - keyword, text.text

* *crontab.month* - The month of the year for the job
* *time.month* - Current month in UTC

**mount_namespace_id** - keyword, text.text

* *deb_packages.mount_namespace_id* - Mount namespace id
* *file.mount_namespace_id* - Mount namespace id
* *hash.mount_namespace_id* - Mount namespace id
* *npm_packages.mount_namespace_id* - Mount namespace id
* *os_version.mount_namespace_id* - Mount namespace id
* *rpm_packages.mount_namespace_id* - Mount namespace id

**mount_point** - keyword, text.text

* *docker_volumes.mount_point* - Mount point

**mountable** - keyword, number.long

* *disk_events.mountable* - 1 if mountable, 0 if not

**mtime** - keyword

* *device_file.mtime* - Last modification time
* *file.mtime* - Last modification time
* *file_events.mtime* - Last modification time
* *gatekeeper_approved_apps.mtime* - Last modification time
* *process_events.mtime* - File modification in UNIX time
* *quicklook_cache.mtime* - Parsed version date field
* *registry.mtime* - timestamp of the most recent registry write

**mtu** - keyword, number.long

* *interface_details.mtu* - Network MTU
* *lxd_networks.mtu* - MTU size
* *routes.mtu* - Maximum Transmission Unit for the route

**name** - keyword, text.text

* *acpi_tables.name* - ACPI table name
* *ad_config.name* - The macOS-specific configuration name
* *apparmor_events.name* - Process name
* *apparmor_profiles.name* - Policy name.
* *apps.name* - Name of the Name.app folder
* *apt_sources.name* - Repository name
* *autoexec.name* - Name of the program
* *azure_instance_metadata.name* - Name of the VM
* *block_devices.name* - Block device name
* *browser_plugins.name* - Plugin display name
* *chocolatey_packages.name* - Package display name
* *chrome_extensions.name* - Extension display name
* *connected_displays.name* - The name of the display.
* *cups_destinations.name* - Name of the printer
* *deb_packages.name* - Package name
* *disk_encryption.name* - Disk name
* *disk_events.name* - Disk event name
* *disk_info.name* - The label of the disk object.
* *dns_cache.name* - DNS record name
* *docker_container_mounts.name* - Optional mount name
* *docker_container_networks.name* - Network name
* *docker_container_processes.name* - The process path or shorthand argv[0]
* *docker_container_stats.name* - Container name
* *docker_containers.name* - Container name
* *docker_info.name* - Name of the docker host
* *docker_networks.name* - Network name
* *docker_volume_labels.name* - Volume name
* *docker_volumes.name* - Volume name
* *etc_protocols.name* - Protocol name
* *etc_services.name* - Service name
* *fan_speed_sensors.name* - Fan name
* *firefox_addons.name* - Addon display name
* *homebrew_packages.name* - Package name
* *ie_extensions.name* - Extension display name
* *iokit_devicetree.name* - Device node name
* *iokit_registry.name* - Default name of the node
* *kernel_extensions.name* - Extension label
* *kernel_modules.name* - Module name
* *kernel_panics.name* - Process name corresponding to crashed thread
* *launchd.name* - File name of plist (used by launchd)
* *lxd_certificates.name* - Name of the certificate
* *lxd_instance_config.name* - Instance name
* *lxd_instance_devices.name* - Instance name
* *lxd_instances.name* - Instance name
* *lxd_networks.name* - Name of the network
* *lxd_storage_pools.name* - Name of the storage pool
* *managed_policies.name* - Policy key name
* *md_personalities.name* - Name of personality supported by kernel
* *memory_map.name* - Region name
* *npm_packages.name* - Package display name
* *ntdomains.name* - The label by which the object is known.
* *nvram.name* - Variable name
* *os_version.name* - Distribution or product name
* *osquery_events.name* - Event publisher or subscriber name
* *osquery_extensions.name* - Extension's name
* *osquery_flags.name* - Flag name
* *osquery_packs.name* - The given name for this query pack
* *osquery_registry.name* - Name of the plugin item
* *osquery_schedule.name* - The given name for this query
* *package_install_history.name* - Package display name
* *physical_disk_performance.name* - Name of the physical disk
* *pipes.name* - Name of the pipe
* *power_sensors.name* - Name of power source
* *processes.name* - The process path or shorthand argv[0]
* *programs.name* - Commonly used product name.
* *python_packages.name* - Package display name
* *registry.name* - Name of the registry value entry
* *rpm_packages.name* - RPM package name
* *safari_extensions.name* - Extension display name
* *scheduled_tasks.name* - Name of the scheduled task
* *services.name* - Service name
* *shared_folders.name* - The shared name of the folder as it appears to other users
* *shared_resources.name* - Alias given to a path set up as a share on a computer system running Windows.
* *startup_items.name* - Name of startup item
* *system_controls.name* - Full sysctl MIB name
* *temperature_sensors.name* - Name of temperature source
* *vscode_extensions.name* - Extension Name
* *windows_firewall_rules.name* - Friendly name of the rule
* *windows_optional_features.name* - Name of the feature
* *windows_search.name* - The name of the item
* *windows_security_products.name* - Name of product
* *wmi_bios_info.name* - Name of the Bios setting
* *wmi_cli_event_consumers.name* - Unique name of a consumer.
* *wmi_event_filters.name* - Unique identifier of an event filter.
* *wmi_script_event_consumers.name* - Unique identifier for the event consumer.
* *xprotect_entries.name* - Description of XProtected malware
* *xprotect_reports.name* - Description of XProtected malware
* *ycloud_instance_metadata.name* - Name of the VM
* *yum_sources.name* - Repository name

**name_constraints** - keyword, text.text

* *curl_certificate.name_constraints* - Name Constraints

**namespace** - keyword, text.text

* *apparmor_events.namespace* - AppArmor namespace

**native** - keyword, number.long

* *browser_plugins.native* - Plugin requires native execution

**net_namespace** - keyword, text.text

* *docker_containers.net_namespace* - Network namespace
* *listening_ports.net_namespace* - The inode number of the network namespace
* *process_namespaces.net_namespace* - net namespace inode
* *process_open_sockets.net_namespace* - The inode number of the network namespace

**netmask** - keyword, text.text

* *dns_resolvers.netmask* - Address (sortlist) netmask length
* *routes.netmask* - Netmask length

**network_id** - keyword, text.text

* *docker_container_networks.network_id* - Network ID

**network_name** - keyword, text.text

* *wifi_networks.network_name* - Name of the network
* *wifi_status.network_name* - Name of the network
* *wifi_survey.network_name* - Name of the network

**network_rx_bytes** - keyword, number.long

* *docker_container_stats.network_rx_bytes* - Total network bytes read

**network_tx_bytes** - keyword, number.long

* *docker_container_stats.network_tx_bytes* - Total network bytes transmitted

**new_administrator_name** - keyword, text.text

* *security_profile_info.new_administrator_name* - Determines the name of the Administrator account on the local computer

**new_guest_name** - keyword, text.text

* *security_profile_info.new_guest_name* - Determines the name of the Guest account on the local computer

**next_run_time** - keyword, number.long

* *scheduled_tasks.next_run_time* - Timestamp the task is scheduled to run next

**nice** - keyword, number.long

* *cpu_time.nice* - Time spent in user mode with low priority (nice)
* *docker_container_processes.nice* - Process nice level (-20 to 20, default 0)
* *processes.nice* - Process nice level (-20 to 20, default 0)

**no_proxy** - keyword, text.text

* *docker_info.no_proxy* - Comma-separated list of domain extensions proxy should not be used for

**node** - keyword, text.text

* *augeas.node* - The node path of the configuration item

**node_ref_number** - keyword, text.text

* *ntfs_journal_events.node_ref_number* - The ordinal that associates a journal record with a filename

**noise** - keyword, number.long

* *wifi_status.noise* - The current noise measurement (dBm)
* *wifi_survey.noise* - The current noise measurement (dBm)

**not_valid_after** - keyword, text.text

* *certificates.not_valid_after* - Certificate expiration data

**not_valid_before** - keyword, text.text

* *certificates.not_valid_before* - Lower bound of valid date

**nr_raid_disks** - keyword, number.long

* *md_devices.nr_raid_disks* - Number of partitions or disk devices to comprise the array

**ntime** - keyword, text.text

* *bpf_process_events.ntime* - The nsecs uptime timestamp as obtained from BPF
* *bpf_socket_events.ntime* - The nsecs uptime timestamp as obtained from BPF

**num_procs** - keyword, number.long

* *docker_container_stats.num_procs* - Number of processors

**number** - keyword, number.long

* *etc_protocols.number* - Protocol number
* *oem_strings.number* - The string index of the structure
* *smbios_tables.number* - Table entry number

**number_memory_devices** - keyword, number.long

* *memory_arrays.number_memory_devices* - Number of memory devices on array

**number_of_cores** - keyword, text.text

* *cpu_info.number_of_cores* - The number of cores of the CPU.

**number_of_efficiency_cores** - keyword, number.long

* *cpu_info.number_of_efficiency_cores* - The number of efficiency cores of the CPU. Only available on Apple Silicon

**number_of_performance_cores** - keyword, number.long

* *cpu_info.number_of_performance_cores* - The number of performance cores of the CPU. Only available on Apple Silicon

**object_name** - keyword, text.text

* *winbaseobj.object_name* - Object Name

**object_path** - keyword, text.text

* *systemd_units.object_path* - The object path for this unit

**object_type** - keyword, text.text

* *winbaseobj.object_type* - Object Type

**obytes** - keyword, number.long

* *interface_details.obytes* - Output bytes

**odrops** - keyword, number.long

* *interface_details.odrops* - Output drops

**oerrors** - keyword, number.long

* *interface_details.oerrors* - Output errors

**offer** - keyword, text.text

* *azure_instance_metadata.offer* - Offer information for the VM image (Azure image gallery VMs only)

**offset** - keyword, number.long

* *device_partitions.offset* - Byte offset from the start of the volume
* *process_memory_map.offset* - Offset into mapped path

**oid** - keyword, text.text

* *system_controls.oid* - Control MIB

**old_path** - keyword, text.text

* *ntfs_journal_events.old_path* - Old path (renames only)

**on_demand** - keyword, text.text

* *launchd.on_demand* - Deprecated key, replaced by keep_alive

**on_disk** - keyword, number.long

* *processes.on_disk* - The process path exists yes=1, no=0, unknown=-1

**online** - keyword, number.long

* *connected_displays.online* - The online status of the display. This field is 1 if the display is online and 0 if it is offline.

**online_cpus** - keyword, number.long

* *docker_container_stats.online_cpus* - Online CPUs

**oom_kill_disable** - keyword, number.long

* *docker_info.oom_kill_disable* - 1 if Out-of-memory kill is disabled. 0 otherwise

**opackets** - keyword, number.long

* *interface_details.opackets* - Output packets

**opaque_version** - keyword, text.text

* *gatekeeper.opaque_version* - Version of Gatekeeper's gkopaque.bundle

**operation** - keyword, text.text

* *apparmor_events.operation* - Permission requested by the process
* *process_file_events.operation* - Operation type
* *windows_update_history.operation* - Operation on an update

**option** - keyword, text.text

* *ad_config.option* - Canonical name of option
* *ssh_configs.option* - The option and value

**option_name** - keyword, text.text

* *cups_destinations.option_name* - Option name

**option_value** - keyword, text.text

* *cups_destinations.option_value* - Option value

**optional** - keyword, number.long

* *xprotect_entries.optional* - Match any of the identities/patterns for this XProtect name

**optional_permissions** - keyword, text.text

* *chrome_extensions.optional_permissions* - The permissions optionally required by the extensions

**optional_permissions_json** - keyword, text.text

* *chrome_extensions.optional_permissions_json* - The JSON-encoded permissions optionally required by the extensions

**options** - keyword, text.text

* *authorized_keys.options* - Optional list of login options
* *dns_resolvers.options* - Resolver options
* *nfs_shares.options* - Options string set on the export share

**organization** - keyword, text.text

* *curl_certificate.organization* - Organization issued to

**organization_unit** - keyword, text.text

* *curl_certificate.organization_unit* - Organization unit issued to

**original_filename** - keyword, text.text

* *file.original_filename* - (Executable files only) Original filename

**original_parent** - keyword, number.long

* *es_process_events.original_parent* - Original parent process ID in case of reparenting

**original_program_name** - keyword, text.text

* *authenticode.original_program_name* - The original program name that the publisher has signed

**os** - keyword, text.text

* *docker_info.os* - Operating system
* *docker_version.os* - Operating system
* *lxd_images.os* - OS on which image is based
* *lxd_instances.os* - The OS of this instance

**os_type** - keyword, text.text

* *azure_instance_metadata.os_type* - Linux or Windows
* *docker_info.os_type* - Operating system type

**os_version** - keyword, text.text

* *kernel_panics.os_version* - Version of the operating system

**other** - keyword, text.text

* *md_devices.other* - Other information associated with array from /proc/mdstat

**other_run_times** - keyword, text.text

* *prefetch.other_run_times* - Other execution times in prefetch file.

**ouid** - keyword, number.long

* *apparmor_events.ouid* - Object owner's user ID

**outiface** - keyword, text.text

* *iptables.outiface* - Output interface for the rule.

**outiface_mask** - keyword, text.text

* *iptables.outiface_mask* - Output interface mask for the rule.

**output_bit** - keyword, number.long

* *cpuid.output_bit* - Bit in register value for feature value

**output_register** - keyword, text.text

* *cpuid.output_register* - Register used to for feature value

**output_size** - keyword, number.long

* *osquery_schedule.output_size* - Cumulative total number of bytes generated by the resultant rows of the query

**overflows** - keyword, text.text

* *process_events.overflows* - List of structures that overflowed

**owned** - keyword, number.long

* *tpm_info.owned* - TPM is owned

**owner** - keyword, text.text

* *windows_search.owner* - The owner of the item

**owner_gid** - keyword, number.long

* *process_events.owner_gid* - File owner group ID

**owner_uid** - keyword, number.long

* *process_events.owner_uid* - File owner user ID
* *shared_memory.owner_uid* - User ID of owning process

**owner_uuid** - keyword, number.long

* *osquery_registry.owner_uuid* - Extension route UUID (0 for core)

**package** - keyword, text.text

* *portage_keywords.package* - Package name
* *portage_packages.package* - Package name
* *portage_use.package* - Package name
* *rpm_package_files.package* - RPM package name

**package_filename** - keyword, text.text

* *package_receipts.package_filename* - Filename of original .pkg file

**package_group** - keyword, text.text

* *rpm_packages.package_group* - Package group

**package_id** - keyword, text.text

* *package_install_history.package_id* - Label packageIdentifiers
* *package_receipts.package_id* - Package domain identifier

**packets** - keyword, number.long

* *iptables.packets* - Number of matching packets for this rule.

**packets_received** - keyword, number.long

* *lxd_networks.packets_received* - Number of packets received on this network

**packets_sent** - keyword, number.long

* *lxd_networks.packets_sent* - Number of packets sent on this network

**page_ins** - keyword, number.long

* *virtual_memory_info.page_ins* - The total number of requests for pages from a pager.

**page_outs** - keyword, number.long

* *virtual_memory_info.page_outs* - Total number of pages paged out.

**parent** - keyword

* *apparmor_events.parent* - Parent process PID
* *block_devices.parent* - Block device parent name
* *bpf_process_events.parent* - Parent process ID
* *bpf_socket_events.parent* - Parent process ID
* *crashes.parent* - Parent PID of the crashed process
* *docker_container_processes.parent* - Process parent's PID
* *es_process_events.parent* - Parent process ID
* *es_process_file_events.parent* - Parent process ID
* *iokit_devicetree.parent* - Parent device registry ID
* *iokit_registry.parent* - Parent registry ID
* *process_events.parent* - Process parent's PID, or -1 if cannot be determined.
* *processes.parent* - Process parent's PID

**parent_pidversion** - keyword, number.long

* *es_process_events.parent_pidversion* - The pidversion of the parent process.

**parent_process_sequence_number** - keyword, number.long

* *process_etw_events.parent_process_sequence_number* - Parent Process Sequence Number - Present only on ProcessStart events

**parent_ref_number** - keyword, text.text

* *ntfs_journal_events.parent_ref_number* - The ordinal that associates a journal record with a filename's parent directory

**part_number** - keyword, text.text

* *memory_devices.part_number* - Manufacturer specific serial number of memory device

**partial** - keyword

* *ntfs_journal_events.partial* - Set to 1 if either path or old_path only contains the file or folder name
* *process_file_events.partial* - True if this is a partial event (i.e.: this process existed before we started osquery)

**partition** - keyword, text.text

* *device_file.partition* - A partition number
* *device_hash.partition* - A partition number
* *device_partitions.partition* - A partition number or description

**partition_row_position** - keyword, number.long

* *memory_device_mapped_addresses.partition_row_position* - Identifies the position of the referenced memory device in a row of the address partition

**partition_width** - keyword, number.long

* *memory_array_mapped_addresses.partition_width* - Number of memory devices that form a single row of memory for the address partition of this structure

**partitions** - keyword, number.long

* *disk_info.partitions* - Number of detected partitions on disk.

**partner_fd** - keyword, number.long

* *process_open_pipes.partner_fd* - File descriptor of shared pipe at partner's end

**partner_mode** - keyword, text.text

* *process_open_pipes.partner_mode* - Mode of shared pipe at partner's end

**partner_pid** - keyword, number.long

* *process_open_pipes.partner_pid* - Process ID of partner process sharing a particular pipe

**passpoint** - keyword, number.long

* *wifi_networks.passpoint* - 1 if Passpoint is supported, 0 otherwise

**password_complexity** - keyword, number.long

* *security_profile_info.password_complexity* - Determines whether passwords must meet a series of strong-password guidelines

**password_history_size** - keyword, number.long

* *security_profile_info.password_history_size* - Number of unique new passwords that must be associated with a user account before an old password can be reused

**password_last_set_time** - keyword, number.double

* *account_policy_data.password_last_set_time* - The time the password was last changed

**password_status** - keyword, text.text

* *shadow.password_status* - Password status

**patch** - keyword, number.long

* *os_version.patch* - Optional patch release

**path** - keyword, text.text

* *alf_exceptions.path* - Path to the executable that is excepted. On macOS 15+ this can also be a bundle identifier
* *apparmor_profiles.path* - Unique, aa-status compatible, policy identifier.
* *appcompat_shims.path* - This is the path to the SDB database.
* *apps.path* - Absolute and full Name.app path
* *augeas.path* - The path to the configuration file
* *authenticode.path* - Must provide a path or directory
* *autoexec.path* - Path to the executable
* *background_activities_moderator.path* - Application file path.
* *bpf_process_events.path* - Binary path
* *bpf_socket_events.path* - Path of executed file
* *browser_plugins.path* - Path to plugin bundle
* *carves.path* - The path of the requested carve
* *certificates.path* - Path to Keychain or PEM bundle
* *chocolatey_packages.path* - Path at which this package resides
* *chrome_extension_content_scripts.path* - Path to extension folder
* *chrome_extensions.path* - Path to extension folder
* *crashes.path* - Path to the crashed process
* *crontab.path* - File parsed
* *device_file.path* - A logical path within the device node
* *disk_events.path* - Path of the DMG file accessed
* *docker_container_fs_changes.path* - FIle or directory path relative to rootfs
* *docker_containers.path* - Container path
* *es_process_events.path* - Path of executed file
* *es_process_file_events.path* - Path of executed file
* *extended_attributes.path* - Absolute file path
* *file.path* - Absolute file path
* *firefox_addons.path* - Path to plugin bundle
* *gatekeeper_approved_apps.path* - Path of executable allowed to run
* *hardware_events.path* - Local device path assigned (optional)
* *hash.path* - Must provide a path or directory
* *homebrew_packages.path* - Package install path
* *ie_extensions.path* - Path to executable
* *kernel_extensions.path* - Optional path to extension bundle
* *kernel_info.path* - Kernel path
* *kernel_panics.path* - Location of log file
* *keychain_acls.path* - The path of the authorized application
* *keychain_items.path* - Path to keychain containing item
* *launchd.path* - Path to daemon or agent plist
* *launchd_overrides.path* - Path to daemon or agent plist
* *listening_ports.path* - Path for UNIX domain sockets
* *magic.path* - Absolute path to target file
* *mdfind.path* - Path of the file returned from spotlight
* *mdls.path* - Path of the file
* *mounts.path* - Mounted device path
* *npm_packages.path* - Path at which this module resides
* *ntfs_acl_permissions.path* - Path to the file or directory.
* *ntfs_journal_events.path* - Path
* *office_mru.path* - File path
* *osquery_extensions.path* - Path of the extension's Thrift connection or library path
* *package_bom.path* - Path of package bom
* *package_receipts.path* - Path of receipt plist
* *plist.path* - (required) read preferences from a plist
* *prefetch.path* - Prefetch file path.
* *process_etw_events.path* - Path of executed binary
* *process_events.path* - Path of executed file
* *process_file_events.path* - The path associated with the event
* *process_memory_map.path* - Path to mapped file or mapped type
* *process_open_files.path* - Filesystem path of descriptor
* *process_open_sockets.path* - For UNIX sockets (family=AF_UNIX), the domain path
* *processes.path* - Path to executed binary
* *python_packages.path* - Path at which this module resides
* *quicklook_cache.path* - Path of file
* *registry.path* - Full path to the value
* *rpm_package_files.path* - File path within the package
* *safari_extensions.path* - Path to the Info.plist describing the extension
* *sandboxes.path* - Path to sandbox container directory
* *scheduled_tasks.path* - Path to the executable to be run
* *services.path* - Path to Service Executable
* *shared_folders.path* - Absolute path of shared folder on the local system
* *shared_resources.path* - Local path of the Windows share.
* *shellbags.path* - Directory name.
* *shimcache.path* - This is the path to the executed file.
* *signature.path* - Must provide a path or directory
* *socket_events.path* - Path of executed file
* *startup_items.path* - Path of startup item
* *suid_bin.path* - Binary path
* *system_extensions.path* - Original path of system extension
* *user_events.path* - Supplied path from event
* *user_ssh_keys.path* - Path to key file
* *userassist.path* - Application file path.
* *vscode_extensions.path* - Extension path
* *windows_crashes.path* - Path of the executable file for the crashed process
* *windows_search.path* - The full path of the item.
* *yara.path* - The path scanned

**pci_class** - keyword, text.text

* *pci_devices.pci_class* - PCI Device class

**pci_class_id** - keyword, text.text

* *pci_devices.pci_class_id* - PCI Device class ID in hex format

**pci_slot** - keyword, text.text

* *interface_details.pci_slot* - PCI slot number
* *pci_devices.pci_slot* - PCI Device used slot

**pci_subclass** - keyword, text.text

* *pci_devices.pci_subclass* - PCI Device subclass

**pci_subclass_id** - keyword, text.text

* *pci_devices.pci_subclass_id* - PCI Device  subclass in hex format

**pem** - keyword, text.text

* *curl_certificate.pem* - Certificate PEM format

**percent_disk_read_time** - keyword, number.long

* *physical_disk_performance.percent_disk_read_time* - Percentage of elapsed time that the selected disk drive is busy servicing read requests

**percent_disk_time** - keyword, number.long

* *physical_disk_performance.percent_disk_time* - Percentage of elapsed time that the selected disk drive is busy servicing read or write requests

**percent_disk_write_time** - keyword, number.long

* *physical_disk_performance.percent_disk_write_time* - Percentage of elapsed time that the selected disk drive is busy servicing write requests

**percent_idle_time** - keyword, number.long

* *physical_disk_performance.percent_idle_time* - Percentage of time during the sample interval that the disk was idle

**percent_processor_time** - keyword, number.long

* *processes.percent_processor_time* - Returns elapsed time that all of the threads of this process used the processor to execute instructions in 100 nanoseconds ticks.

**percent_remaining** - keyword, number.long

* *battery.percent_remaining* - The percentage of battery remaining before it is drained

**percentage_encrypted** - keyword, number.long

* *bitlocker_info.percentage_encrypted* - The percentage of the drive that is encrypted.

**perf_ctl** - keyword, number.long

* *msr.perf_ctl* - Performance setting for the processor.

**perf_status** - keyword, number.long

* *msr.perf_status* - Performance status for the processor.

**period** - keyword, text.text

* *load_average.period* - Period over which the average is calculated.

**permanent** - keyword, text.text

* *arp_cache.permanent* - 1 for true, 0 for false

**permissions** - keyword, text.text

* *chrome_extensions.permissions* - The permissions required by the extension
* *kernel_keys.permissions* - The key permissions, expressed as four hexadecimal bytes containing, from left to right, the possessor, user, group, and other permissions.
* *process_memory_map.permissions* - r=read, w=write, x=execute, p=private (cow)
* *shared_memory.permissions* - Memory segment permissions
* *suid_bin.permissions* - Binary permissions

**permissions_json** - keyword, text.text

* *chrome_extensions.permissions_json* - The JSON-encoded permissions required by the extension

**persistent** - keyword, number.long

* *chrome_extensions.persistent* - 1 If extension is persistent across all tabs else 0

**persistent_volume_id** - keyword, text.text

* *bitlocker_info.persistent_volume_id* - Persistent ID of the drive.

**personal_hotspot** - keyword, number.long

* *wifi_networks.personal_hotspot* - 1 if this network is a personal hotspot, 0 otherwise

**pgroup** - keyword, number.long

* *docker_container_processes.pgroup* - Process group
* *processes.pgroup* - Process group

**physical_adapter** - keyword, number.long

* *interface_details.physical_adapter* - Indicates whether the adapter is a physical or a logical adapter.

**physical_memory** - keyword, number.long

* *system_info.physical_memory* - Total physical memory in bytes

**physical_presence_version** - keyword, text.text

* *tpm_info.physical_presence_version* - Version of the Physical Presence Interface

**pid** - keyword, number.long

* *apparmor_events.pid* - Process ID
* *asl.pid* - Sending process ID encoded as a string.  Set automatically.
* *bpf_process_events.pid* - Process ID
* *bpf_socket_events.pid* - Process ID
* *crashes.pid* - Process (or thread) ID of the crashed process
* *docker_container_processes.pid* - Process ID
* *docker_containers.pid* - Identifier of the initial process
* *es_process_events.pid* - Process (or thread) ID
* *es_process_file_events.pid* - Process (or thread) ID
* *last.pid* - Process (or thread) ID
* *listening_ports.pid* - Process (or thread) ID
* *logged_in_users.pid* - Process (or thread) ID
* *lxd_instances.pid* - Instance's process ID
* *osquery_info.pid* - Process (or thread/handle) ID
* *pipes.pid* - Process ID of the process to which the pipe belongs
* *process_envs.pid* - Process (or thread) ID
* *process_etw_events.pid* - Process ID
* *process_events.pid* - Process (or thread) ID
* *process_file_events.pid* - Process ID
* *process_memory_map.pid* - Process (or thread) ID
* *process_namespaces.pid* - Process (or thread) ID
* *process_open_files.pid* - Process (or thread) ID
* *process_open_pipes.pid* - Process ID
* *process_open_sockets.pid* - Process (or thread) ID
* *processes.pid* - Process (or thread) ID
* *running_apps.pid* - The pid of the application
* *seccomp_events.pid* - Process ID
* *services.pid* - the Process ID of the service
* *shared_memory.pid* - Process ID to last use the segment
* *socket_events.pid* - Process (or thread) ID
* *unified_log.pid* - the pid of the process that made the entry
* *user_events.pid* - Process (or thread) ID
* *windows_crashes.pid* - Process ID of the crashed process
* *windows_eventlog.pid* - Process ID which emitted the event record

**pid_namespace** - keyword, text.text

* *docker_containers.pid_namespace* - PID namespace
* *process_namespaces.pid_namespace* - pid namespace inode

**pid_with_namespace** - keyword, number.long

* *apt_sources.pid_with_namespace* - Pids that contain a namespace
* *authorized_keys.pid_with_namespace* - Pids that contain a namespace
* *crontab.pid_with_namespace* - Pids that contain a namespace
* *deb_packages.pid_with_namespace* - Pids that contain a namespace
* *dns_resolvers.pid_with_namespace* - Pids that contain a namespace
* *etc_hosts.pid_with_namespace* - Pids that contain a namespace
* *file.pid_with_namespace* - Pids that contain a namespace
* *groups.pid_with_namespace* - Pids that contain a namespace
* *hash.pid_with_namespace* - Pids that contain a namespace
* *npm_packages.pid_with_namespace* - Pids that contain a namespace
* *os_version.pid_with_namespace* - Pids that contain a namespace
* *python_packages.pid_with_namespace* - Pids that contain a namespace
* *rpm_packages.pid_with_namespace* - Pids that contain a namespace
* *suid_bin.pid_with_namespace* - Pids that contain a namespace
* *user_ssh_keys.pid_with_namespace* - Pids that contain a namespace
* *users.pid_with_namespace* - Pids that contain a namespace
* *yara.pid_with_namespace* - Pids that contain a namespace
* *yum_sources.pid_with_namespace* - Pids that contain a namespace

**pids** - keyword, number.long

* *docker_container_stats.pids* - Number of processes

**pidversion** - keyword, number.long

* *es_process_events.pidversion* - Process ID version

**pixels** - keyword, text.text

* *connected_displays.pixels* - The number of pixels of the display.

**pk_hash** - keyword, text.text

* *keychain_items.pk_hash* - Hash of associated public key (SHA1 of subjectPublicKey, see RFC 8520 4.2.1.2)

**placement_group_id** - keyword, text.text

* *azure_instance_metadata.placement_group_id* - Placement group for the VM scale set

**platform** - keyword, text.text

* *os_version.platform* - OS Platform or ID
* *osquery_packs.platform* - Platforms this query is supported on

**platform_binary** - keyword, number.long

* *es_process_events.platform_binary* - Indicates if the binary is Apple signed binary (1) or not (0)

**platform_fault_domain** - keyword, text.text

* *azure_instance_metadata.platform_fault_domain* - Fault domain the VM is running in

**platform_info** - keyword, number.long

* *msr.platform_info* - Platform information.

**platform_like** - keyword, text.text

* *os_version.platform_like* - Closely related platforms

**platform_mask** - keyword, number.long

* *osquery_info.platform_mask* - The osquery platform bitmask

**platform_update_domain** - keyword, text.text

* *azure_instance_metadata.platform_update_domain* - Update domain the VM is running in

**plugin** - keyword, text.text

* *authorization_mechanisms.plugin* - Authorization plugin name

**pnp_device_id** - keyword, text.text

* *disk_info.pnp_device_id* - The unique identifier of the drive on the system.

**point_to_point** - keyword, text.text

* *interface_addresses.point_to_point* - PtP address for the interface

**policies** - keyword, text.text

* *curl_certificate.policies* - Certificate Policies

**policy** - keyword, text.text

* *iptables.policy* - Policy that applies for this rule.

**policy_constraints** - keyword, text.text

* *curl_certificate.policy_constraints* - Policy Constraints

**policy_content** - keyword, text.text

* *password_policy.policy_content* - Policy content

**policy_description** - keyword, text.text

* *password_policy.policy_description* - Policy description

**policy_identifier** - keyword, text.text

* *password_policy.policy_identifier* - Policy Identifier

**policy_mappings** - keyword, text.text

* *curl_certificate.policy_mappings* - Policy Mappings

**port** - keyword, number.long

* *docker_container_ports.port* - Port inside the container
* *etc_services.port* - Service port number
* *listening_ports.port* - Transport layer port

**possibly_hidden** - keyword, number.long

* *wifi_networks.possibly_hidden* - 1 if network is possibly a hidden network, 0 otherwise

**ppid** - keyword, number.long

* *process_etw_events.ppid* - Parent Process ID
* *process_file_events.ppid* - Parent process ID

**pre_cpu_kernelmode_usage** - keyword, number.long

* *docker_container_stats.pre_cpu_kernelmode_usage* - Last read CPU kernel mode usage

**pre_cpu_total_usage** - keyword, number.long

* *docker_container_stats.pre_cpu_total_usage* - Last read total CPU usage

**pre_cpu_usermode_usage** - keyword, number.long

* *docker_container_stats.pre_cpu_usermode_usage* - Last read CPU user mode usage

**pre_online_cpus** - keyword, number.long

* *docker_container_stats.pre_online_cpus* - Last read online CPUs

**pre_system_cpu_usage** - keyword, number.long

* *docker_container_stats.pre_system_cpu_usage* - Last read CPU system usage

**predicate** - keyword, text.text

* *unified_log.predicate* - predicate to search (see `log help predicates`), note that this is merged into the predicate created from the column constraints

**prefix** - keyword, text.text

* *homebrew_packages.prefix* - Homebrew install prefix

**preread** - keyword, number.long

* *docker_container_stats.preread* - UNIX time when stats were last read

**prerelease** - keyword, number.long

* *vscode_extensions.prerelease* - Pre release version

**principal** - keyword, text.text

* *ntfs_acl_permissions.principal* - User or group to which the ACE applies.

**printer_sharing** - keyword, number.long

* *sharing_preferences.printer_sharing* - 1 If printer sharing is enabled else 0

**priority** - keyword, text.text

* *deb_packages.priority* - Package priority

**privileged** - keyword, text.text

* *authorization_mechanisms.privileged* - If privileged it will run as root, else as an anonymous user
* *docker_containers.privileged* - Is the container privileged

**probe_error** - keyword, number.long

* *bpf_process_events.probe_error* - Set to 1 if one or more buffers could not be captured
* *bpf_socket_events.probe_error* - Set to 1 if one or more buffers could not be captured

**process** - keyword, text.text

* *alf_explicit_auths.process* - Process name that is explicitly allowed
* *unified_log.process* - the name of the process that made the entry

**process_being_tapped** - keyword, number.long

* *event_taps.process_being_tapped* - The process ID of the target application

**process_sequence_number** - keyword, number.long

* *process_etw_events.process_sequence_number* - Process Sequence Number - Present only on ProcessStart events

**process_type** - keyword, text.text

* *launchd.process_type* - Key describes the intended purpose of the job

**process_uptime** - keyword, number.long

* *windows_crashes.process_uptime* - Uptime of the process in seconds

**processes** - keyword, number.long

* *lxd_instances.processes* - Number of processes running inside this instance

**processing_time** - keyword, number.long

* *cups_jobs.processing_time* - How long the job took to process

**processor_number** - keyword, number.long

* *msr.processor_number* - The processor number as reported in /proc/cpuinfo

**processor_type** - keyword, text.text

* *cpu_info.processor_type* - The processor type, such as Central, Math, or Video.

**product_id** - keyword, text.text

* *connected_displays.product_id* - The product ID of the display.

**product_name** - keyword, text.text

* *tpm_info.product_name* - Product name of the TPM

**product_version** - keyword, text.text

* *file.product_version* - File product version

**profile** - keyword, text.text

* *apparmor_events.profile* - Apparmor profile name
* *chrome_extensions.profile* - The name of the Chrome profile that contains this extension

**profile_domain** - keyword, number.long

* *windows_firewall_rules.profile_domain* - 1 if the rule profile type is domain

**profile_path** - keyword, text.text

* *chrome_extension_content_scripts.profile_path* - The profile path
* *chrome_extensions.profile_path* - The profile path
* *logon_sessions.profile_path* - The home directory for the logon session.

**profile_private** - keyword, number.long

* *windows_firewall_rules.profile_private* - 1 if the rule profile type is private

**profile_public** - keyword, number.long

* *windows_firewall_rules.profile_public* - 1 if the rule profile type is public

**program** - keyword, text.text

* *launchd.program* - Path to target program

**program_arguments** - keyword, text.text

* *launchd.program_arguments* - Command line arguments passed to program

**propagation** - keyword, text.text

* *docker_container_mounts.propagation* - Mount propagation

**properties** - keyword, text.text

* *windows_search.properties* - Additional property values JSON

**protected** - keyword, number.long

* *app_schemes.protected* - 1 if this handler is protected (reserved) by macOS, else 0

**protection_disabled** - keyword, number.long

* *carbon_black_info.protection_disabled* - If the sensor is configured to report tamper events

**protection_status** - keyword, number.long

* *bitlocker_info.protection_status* - The bitlocker protection status of the drive.

**protection_type** - keyword, text.text

* *processes.protection_type* - The protection type of the process

**protocol** - keyword

* *bpf_socket_events.protocol* - The network protocol ID
* *etc_services.protocol* - Transport protocol (TCP/UDP)
* *iptables.protocol* - Protocol number identification.
* *listening_ports.protocol* - Transport protocol (TCP/UDP)
* *process_open_sockets.protocol* - Transport protocol (TCP/UDP)
* *socket_events.protocol* - The network protocol ID
* *usb_devices.protocol* - USB Device protocol
* *windows_firewall_rules.protocol* - IP protocol of the rule

**provider** - keyword, text.text

* *drivers.provider* - Driver provider

**provider_guid** - keyword, text.text

* *windows_eventlog.provider_guid* - Provider guid of the event
* *windows_events.provider_guid* - Provider guid of the event

**provider_name** - keyword, text.text

* *windows_eventlog.provider_name* - Provider name of the event
* *windows_events.provider_name* - Provider name of the event

**pseudo** - keyword, number.long

* *process_memory_map.pseudo* - 1 If path is a pseudo path, else 0

**public** - keyword, number.long

* *lxd_images.public* - Whether image is public (1) or not (0)

**publisher** - keyword, text.text

* *azure_instance_metadata.publisher* - Publisher of the VM image
* *osquery_events.publisher* - Name of the associated publisher
* *programs.publisher* - Name of the product supplier.
* *vscode_extensions.publisher* - Publisher Name

**publisher_id** - keyword, text.text

* *vscode_extensions.publisher_id* - Publisher ID

**purgeable** - keyword, number.long

* *virtual_memory_info.purgeable* - Total number of purgeable pages.

**purged** - keyword, number.long

* *virtual_memory_info.purged* - Total number of purged pages.

**query** - keyword, text.text

* *mdfind.query* - The query that was run to find the file
* *osquery_schedule.query* - The exact query to run
* *windows_search.query* - Windows search query
* *wmi_event_filters.query* - Windows Management Instrumentation Query Language (WQL) event query that specifies the set of events for consumer notification, and the specific conditions for notification.

**query_language** - keyword, text.text

* *wmi_event_filters.query_language* - Query language that the query is written in.

**queue_directories** - keyword, text.text

* *launchd.queue_directories* - Similar to watch_paths but only with non-empty directories

**raid_disks** - keyword, number.long

* *md_devices.raid_disks* - Number of configured RAID disks in array

**raid_level** - keyword, number.long

* *md_devices.raid_level* - Current raid level of the array

**rapl_energy_status** - keyword, number.long

* *msr.rapl_energy_status* - Run Time Average Power Limiting energy status.

**rapl_power_limit** - keyword, number.long

* *msr.rapl_power_limit* - Run Time Average Power Limiting power limit.

**rapl_power_units** - keyword, number.long

* *msr.rapl_power_units* - Run Time Average Power Limiting power units.

**reactivated** - keyword, number.long

* *virtual_memory_info.reactivated* - Total number of reactivated pages.

**read** - keyword, number.long

* *docker_container_stats.read* - UNIX time when stats were read

**readonly** - keyword, number.long

* *nfs_shares.readonly* - 1 if the share is exported readonly else 0

**readonly_rootfs** - keyword, number.long

* *docker_containers.readonly_rootfs* - Is the root filesystem mounted as read only

**record_timestamp** - keyword, text.text

* *ntfs_journal_events.record_timestamp* - Journal record timestamp

**record_usn** - keyword, text.text

* *ntfs_journal_events.record_usn* - The update sequence number that identifies the journal record

**recovery_finish** - keyword, text.text

* *md_devices.recovery_finish* - Estimated duration of recovery activity

**recovery_progress** - keyword, text.text

* *md_devices.recovery_progress* - Progress of the recovery activity

**recovery_speed** - keyword, text.text

* *md_devices.recovery_speed* - Speed of recovery activity

**redirect_accept** - keyword, number.long

* *interface_ipv6.redirect_accept* - Accept ICMP redirect messages

**ref_pid** - keyword, number.long

* *asl.ref_pid* - Reference PID for messages proxied by launchd

**ref_proc** - keyword, text.text

* *asl.ref_proc* - Reference process for messages proxied by launchd

**referenced** - keyword, number.long

* *chrome_extension_content_scripts.referenced* - 1 if this extension is referenced by the Preferences file of the profile
* *chrome_extensions.referenced* - 1 if this extension is referenced by the Preferences file of the profile

**referenced_identifier** - keyword, text.text

* *chrome_extensions.referenced_identifier* - Extension identifier, as specified by the preferences file. Empty if the extension is not in the profile.

**refreshes** - keyword, number.long

* *osquery_events.refreshes* - Publisher only: number of runloop restarts

**refs** - keyword, number.long

* *kernel_extensions.refs* - Reference count

**region** - keyword, text.text

* *ec2_instance_metadata.region* - AWS region in which this instance launched

**registers** - keyword, text.text

* *crashes.registers* - The value of the system registers
* *kernel_panics.registers* - A space delimited line of register:value pairs
* *windows_crashes.registers* - The values of the system registers

**registry** - keyword, text.text

* *osquery_registry.registry* - Name of the osquery registry

**registry_hive** - keyword, text.text

* *logged_in_users.registry_hive* - HKEY_USERS registry hive

**registry_path** - keyword, text.text

* *ie_extensions.registry_path* - Extension identifier

**relative_path** - keyword, text.text

* *wmi_cli_event_consumers.relative_path* - Relative path to the class or instance.
* *wmi_event_filters.relative_path* - Relative path to the class or instance.
* *wmi_filter_consumer_binding.relative_path* - Relative path to the class or instance.
* *wmi_script_event_consumers.relative_path* - Relative path to the class or instance.

**release** - keyword, text.text

* *apt_sources.release* - Release name
* *lxd_images.release* - OS release version on which the image is based
* *rpm_packages.release* - Package release

**remediation_path** - keyword, text.text

* *windows_security_products.remediation_path* - Remediation path

**remote_address** - keyword, text.text

* *bpf_socket_events.remote_address* - Remote address associated with socket
* *process_open_sockets.remote_address* - Socket remote address
* *socket_events.remote_address* - Remote address associated with socket

**remote_addresses** - keyword, text.text

* *windows_firewall_rules.remote_addresses* - Remote addresses for the rule

**remote_apple_events** - keyword, number.long

* *sharing_preferences.remote_apple_events* - 1 If remote apple events are enabled else 0

**remote_login** - keyword, number.long

* *sharing_preferences.remote_login* - 1 If remote login is enabled else 0

**remote_management** - keyword, number.long

* *sharing_preferences.remote_management* - 1 If remote management is enabled else 0

**remote_port** - keyword, number.long

* *bpf_socket_events.remote_port* - Remote network protocol port number
* *process_open_sockets.remote_port* - Socket remote port
* *socket_events.remote_port* - Remote network protocol port number

**remote_ports** - keyword, text.text

* *windows_firewall_rules.remote_ports* - Remote ports for the rule

**removable** - keyword, number.long

* *usb_devices.removable* - 1 If USB device is removable else 0

**repository** - keyword, text.text

* *portage_packages.repository* - From which repository the ebuild was used

**request_id** - keyword, text.text

* *carves.request_id* - Identifying value of the carve request (e.g., scheduled query name, distributed request, etc)

**requested_mask** - keyword, text.text

* *apparmor_events.requested_mask* - Requested access mask

**requirement** - keyword, text.text

* *gatekeeper_approved_apps.requirement* - Code signing requirement language

**reservation_id** - keyword, text.text

* *ec2_instance_metadata.reservation_id* - ID of the reservation

**reshape_finish** - keyword, text.text

* *md_devices.reshape_finish* - Estimated duration of reshape activity

**reshape_progress** - keyword, text.text

* *md_devices.reshape_progress* - Progress of the reshape activity

**reshape_speed** - keyword, text.text

* *md_devices.reshape_speed* - Speed of reshape activity

**resident_size** - keyword, number.long

* *docker_container_processes.resident_size* - Bytes of private memory used by process
* *processes.resident_size* - Bytes of private memory used by process

**resolution** - keyword, text.text

* *connected_displays.resolution* - The resolution of the display.

**resource_group_name** - keyword, text.text

* *azure_instance_metadata.resource_group_name* - Resource group for the VM

**response_code** - keyword, number.long

* *curl.response_code* - The HTTP status code for the response

**responsible** - keyword, text.text

* *crashes.responsible* - Process responsible for the crashed process

**responsible_pid** - keyword, number.long

* *es_process_events.responsible_pid* - The pid of the process responsible for this process.

**responsible_pidversion** - keyword, number.long

* *es_process_events.responsible_pidversion* - The pidversion of the process responsible for this process.

**result** - keyword, text.text

* *authenticode.result* - The signature check result
* *curl.result* - The HTTP response body

**result_code** - keyword, text.text

* *windows_update_history.result_code* - Result of an operation on an update

**resync_finish** - keyword, text.text

* *md_devices.resync_finish* - Estimated duration of resync activity

**resync_progress** - keyword, text.text

* *md_devices.resync_progress* - Progress of the resync activity

**resync_speed** - keyword, text.text

* *md_devices.resync_speed* - Speed of resync activity

**retain_count** - keyword, number.long

* *iokit_devicetree.retain_count* - The device reference count
* *iokit_registry.retain_count* - The node reference count

**revision** - keyword, text.text

* *deb_packages.revision* - Package revision
* *hardware_events.revision* - Device revision (optional)
* *os_version.revision* - Update Build Revision, refers to the specific revision number of a Windows update
* *platform_info.revision* - BIOS major and minor revision

**roaming** - keyword, number.long

* *wifi_networks.roaming* - 1 if roaming is supported, 0 otherwise

**roaming_profile** - keyword, text.text

* *wifi_networks.roaming_profile* - Describe the roaming profile, usually one of Single, Dual  or Multi

**root** - keyword, text.text

* *processes.root* - Process virtual root directory

**root_dir** - keyword, text.text

* *docker_info.root_dir* - Docker root directory

**root_directory** - keyword, text.text

* *launchd.root_directory* - Key used to specify a directory to chroot to before launch

**root_volume_uuid** - keyword, text.text

* *time_machine_destinations.root_volume_uuid* - Root UUID of backup volume

**rotation** - keyword, text.text

* *connected_displays.rotation* - The orientation of the display.

**round_trip_time** - keyword, number.long

* *curl.round_trip_time* - Time taken to complete the request

**rowid** - keyword, number.long

* *quicklook_cache.rowid* - Quicklook file rowid key

**rssi** - keyword, number.long

* *wifi_status.rssi* - The current received signal strength indication (dbm)
* *wifi_survey.rssi* - The current received signal strength indication (dbm)

**rtadv_accept** - keyword, number.long

* *interface_ipv6.rtadv_accept* - Accept ICMP Router Advertisement

**rule_details** - keyword, text.text

* *sudoers.rule_details* - Rule definition

**run_at_load** - keyword, text.text

* *launchd.run_at_load* - Should the program run on launch load

**run_count** - keyword, number.long

* *prefetch.run_count* - Number of times the application has been run.

**running_security_services** - keyword, text.text

* *deviceguard_status.running_security_services* - The list of running Device Guard services. Returns UNKNOWN if an error is encountered.

**rw** - keyword, number.long

* *docker_container_mounts.rw* - 1 if read/write. 0 otherwise

**scheme** - keyword, text.text

* *app_schemes.scheme* - Name of the scheme/protocol

**scope** - keyword, text.text

* *selinux_settings.scope* - Where the key is located inside the SELinuxFS mount point.

**screen_sharing** - keyword, number.long

* *sharing_preferences.screen_sharing* - 1 If screen sharing is enabled else 0

**script** - keyword, text.text

* *chrome_extension_content_scripts.script* - The content script used by the extension

**script_block_count** - keyword, number.long

* *powershell_events.script_block_count* - The total number of script blocks for this script

**script_block_id** - keyword, text.text

* *powershell_events.script_block_id* - The unique GUID of the powershell script to which this block belongs

**script_file_name** - keyword, text.text

* *wmi_script_event_consumers.script_file_name* - Name of the file from which the script text is read, intended as an alternative to specifying the text of the script in the ScriptText property.

**script_name** - keyword, text.text

* *powershell_events.script_name* - The name of the Powershell script

**script_path** - keyword, text.text

* *powershell_events.script_path* - The path for the Powershell script

**script_text** - keyword, text.text

* *powershell_events.script_text* - The text content of the Powershell script
* *wmi_script_event_consumers.script_text* - Text of the script that is expressed in a language known to the scripting engine. This property must be NULL if the ScriptFileName property is not NULL.

**scripting_engine** - keyword, text.text

* *wmi_script_event_consumers.scripting_engine* - Name of the scripting engine to use, for example, 'VBScript'. This property cannot be NULL.

**sdb_id** - keyword, text.text

* *appcompat_shims.sdb_id* - Unique GUID of the SDB.

**sdk** - keyword, text.text

* *browser_plugins.sdk* - Build SDK used to compile plugin
* *safari_extensions.sdk* - Bundle SDK used to compile extension

**sdk_version** - keyword, text.text

* *osquery_extensions.sdk_version* - osquery SDK version used to build the extension

**seconds** - keyword, number.long

* *time.seconds* - Current seconds in UTC
* *uptime.seconds* - Seconds of uptime

**section** - keyword, text.text

* *deb_packages.section* - Package section

**secure_boot** - keyword, number.long

* *secureboot.secure_boot* - Whether secure boot is enabled

**secure_mode** - keyword, number.long

* *secureboot.secure_mode* - (Intel) Secure mode: 0 disabled, 1 full security, 2 medium security

**secure_process** - keyword, number.long

* *processes.secure_process* - Process is secure (IUM) yes=1, no=0

**security_breach** - keyword, text.text

* *chassis_info.security_breach* - The physical status of the chassis such as Breach Successful, Breach Attempted, etc.

**security_groups** - keyword, text.text

* *ec2_instance_metadata.security_groups* - Comma separated list of security group names

**security_options** - keyword, text.text

* *docker_containers.security_options* - List of container security options

**security_type** - keyword, text.text

* *wifi_networks.security_type* - Type of security on this network
* *wifi_status.security_type* - Type of security on this network

**self_signed** - keyword, number.long

* *certificates.self_signed* - 1 if self-signed, else 0

**sender** - keyword, text.text

* *asl.sender* - Sender's identification string.  Default is process name.
* *unified_log.sender* - the name of the binary image that made the entry

**sensor_backend_server** - keyword, text.text

* *carbon_black_info.sensor_backend_server* - Carbon Black server

**sensor_id** - keyword, number.long

* *carbon_black_info.sensor_id* - Sensor ID of the Carbon Black sensor

**sensor_ip_addr** - keyword, text.text

* *carbon_black_info.sensor_ip_addr* - IP address of the sensor

**seq_num** - keyword, number.long

* *es_process_events.seq_num* - Per event sequence number
* *es_process_file_events.seq_num* - Per event sequence number

**serial** - keyword, text.text

* *certificates.serial* - Certificate serial number
* *chassis_info.serial* - The serial number of the chassis.
* *disk_info.serial* - The serial number of the disk.
* *hardware_events.serial* - Device serial (optional)
* *usb_devices.serial* - USB Device serial connection

**serial_number** - keyword, text.text

* *authenticode.serial_number* - The certificate serial number
* *battery.serial_number* - The battery's serial number
* *connected_displays.serial_number* - The serial number of the display. (may not be unique)
* *curl_certificate.serial_number* - Certificate serial number
* *kernel_keys.serial_number* - The serial key of the key.
* *memory_devices.serial_number* - Serial number of memory device

**serial_port_enabled** - keyword, text.text

* *ycloud_instance_metadata.serial_port_enabled* - Indicates if serial port is enabled for the VM

**series** - keyword, text.text

* *video_info.series* - The series of the gpu.

**server_name** - keyword, text.text

* *lxd_cluster.server_name* - Name of the LXD server node
* *lxd_cluster_members.server_name* - Name of the LXD server node

**server_selection** - keyword, text.text

* *windows_update_history.server_selection* - Value that indicates which server provided an update

**server_version** - keyword, text.text

* *docker_info.server_version* - Server version

**service** - keyword, text.text

* *drivers.service* - Driver service name, if one exists
* *interface_details.service* - The name of the service the network adapter uses.
* *iokit_devicetree.service* - 1 if the device conforms to IOService else 0

**service_exit_code** - keyword, number.long

* *services.service_exit_code* - The service-specific error code that the service returns when an error occurs while the service is starting or stopping

**service_id** - keyword, text.text

* *windows_update_history.service_id* - Service identifier of an update service that is not a Windows update

**service_key** - keyword, text.text

* *drivers.service_key* - Driver service registry key

**service_name** - keyword, text.text

* *windows_firewall_rules.service_name* - Service name property of the application

**service_type** - keyword, text.text

* *services.service_type* - Service Type: OWN_PROCESS, SHARE_PROCESS and maybe Interactive (can interact with the desktop)

**ses** - keyword, number.long

* *seccomp_events.ses* - Session ID of the session from which the analyzed process was invoked

**session_id** - keyword, number.long

* *es_process_events.session_id* - The identifier of the session that contains the process group.
* *logon_sessions.session_id* - The Terminal Services session identifier.
* *process_etw_events.session_id* - Session ID
* *winbaseobj.session_id* - Terminal Services Session Id

**session_owner** - keyword, text.text

* *authorizations.session_owner* - Label top-level key

**set** - keyword, number.long

* *memory_devices.set* - Identifies if memory device is one of a set of devices.  A value of 0 indicates no set affiliation.

**setup_mode** - keyword, number.long

* *secureboot.setup_mode* - Whether setup mode is enabled

**severity** - keyword, number.long

* *syslog_events.severity* - Syslog severity

**sgid** - keyword

* *docker_container_processes.sgid* - Saved group ID
* *process_events.sgid* - Saved group ID at process start
* *process_file_events.sgid* - Saved group ID of the process using the file
* *processes.sgid* - Unsigned saved group ID

**sha1** - keyword, text.text

* *apparmor_profiles.sha1* - A unique hash that identifies this policy.
* *certificates.sha1* - SHA1 hash of the raw certificate contents
* *device_hash.sha1* - SHA1 hash of provided inode data
* *file_events.sha1* - The SHA1 of the file after change
* *hash.sha1* - SHA1 hash of provided filesystem data
* *rpm_packages.sha1* - SHA1 hash of the package contents

**sha1_fingerprint** - keyword, text.text

* *curl_certificate.sha1_fingerprint* - SHA1 fingerprint

**sha256** - keyword, text.text

* *apparmor_profiles.sha256* - A unique hash that identifies this policy.
* *carves.sha256* - A SHA256 sum of the carved archive
* *device_hash.sha256* - SHA256 hash of provided inode data
* *file_events.sha256* - The SHA256 of the file after change
* *hash.sha256* - SHA256 hash of provided filesystem data
* *rpm_package_files.sha256* - SHA256 file digest from RPM info DB

**sha256_fingerprint** - keyword, text.text

* *curl_certificate.sha256_fingerprint* - SHA-256 fingerprint

**shard** - keyword, number.long

* *osquery_packs.shard* - Shard restriction limit, 1-100, 0 meaning no restriction

**share** - keyword, text.text

* *nfs_shares.share* - Filesystem path to the share

**shared** - keyword, text.text

* *authorizations.shared* - Label top-level key

**shell** - keyword, text.text

* *users.shell* - User's configured default shell

**shell_only** - keyword, number.long

* *osquery_flags.shell_only* - Is the flag shell only?

**shmid** - keyword, number.long

* *shared_memory.shmid* - Shared memory segment ID

**shortcut_comment** - keyword, text.text

* *file.shortcut_comment* - Comment on the shortcut

**shortcut_run** - keyword, text.text

* *file.shortcut_run* - Window mode the target of the shortcut should be run in

**shortcut_start_in** - keyword, text.text

* *file.shortcut_start_in* - Full path to the working directory to use when executing the shortcut target

**shortcut_target_location** - keyword, text.text

* *file.shortcut_target_location* - Folder name where the shortcut target resides

**shortcut_target_path** - keyword, text.text

* *file.shortcut_target_path* - Full path to the file the shortcut points to

**shortcut_target_type** - keyword, text.text

* *file.shortcut_target_type* - Display name for the target type

**sid** - keyword, text.text

* *background_activities_moderator.sid* - User SID.
* *certificates.sid* - SID
* *logged_in_users.sid* - The user's unique security identifier
* *office_mru.sid* - User SID
* *shellbags.sid* - User SID
* *userassist.sid* - User SID.

**sig** - keyword, number.long

* *seccomp_events.sig* - Signal value sent to process by seccomp

**sig_group** - keyword, text.text

* *yara.sig_group* - Signature group used

**sigfile** - keyword, text.text

* *yara.sigfile* - Signature file used

**signature** - keyword, text.text

* *curl_certificate.signature* - Signature

**signature_algorithm** - keyword, text.text

* *curl_certificate.signature_algorithm* - Signature Algorithm

**signatures_up_to_date** - keyword, number.long

* *windows_security_products.signatures_up_to_date* - 1 if product signatures are up to date, else 0

**signed** - keyword, number.long

* *drivers.signed* - Whether the driver is signed or not
* *signature.signed* - 1 If the file is signed else 0

**signing_algorithm** - keyword, text.text

* *certificates.signing_algorithm* - Signing algorithm used

**signing_id** - keyword, text.text

* *es_process_events.signing_id* - Signature identifier of the process

**sigrule** - keyword, text.text

* *yara.sigrule* - Signature strings used

**sigurl** - keyword, text.text

* *yara.sigurl* - Signature url

**size** - keyword

* *acpi_tables.size* - Size of compiled table data
* *block_devices.size* - Block device size in blocks
* *carves.size* - Size of the carved archive
* *cups_jobs.size* - The size of the print job
* *deb_packages.size* - Package size in bytes
* *device_file.size* - Size of file in bytes
* *disk_events.size* - Size of partition in bytes
* *docker_image_history.size* - Size of instruction in bytes
* *file.size* - Size of file in bytes
* *file_events.size* - Size of file in bytes
* *kernel_extensions.size* - Bytes of wired memory used by extension
* *kernel_modules.size* - Size of module content
* *logical_drives.size* - The total amount of space, in bytes, of the drive (-1 on failure).
* *lxd_images.size* - Size of image in bytes
* *lxd_storage_pools.size* - Size of the storage pool
* *md_devices.size* - size of the array in blocks
* *memory_devices.size* - Size of memory device in Megabyte
* *package_bom.size* - Expected file size
* *platform_info.size* - Size in bytes of firmware
* *portage_packages.size* - The size of the package
* *prefetch.size* - Application file size.
* *quicklook_cache.size* - Parsed version size field
* *rpm_package_files.size* - Expected file size in bytes from RPM info DB
* *rpm_packages.size* - Package size in bytes
* *shared_memory.size* - Size in bytes
* *smbios_tables.size* - Table entry size in bytes
* *smc_keys.size* - Reported size of data in bytes
* *windows_search.size* - The item size in bytes.

**size_bytes** - keyword, number.long

* *docker_images.size_bytes* - Size of image in bytes

**sku** - keyword, text.text

* *azure_instance_metadata.sku* - SKU for the VM image
* *chassis_info.sku* - The Stock Keeping Unit number if available.

**slot** - keyword

* *md_drives.slot* - Slot position of disk
* *portage_packages.slot* - The slot used by package

**smbios_tag** - keyword, text.text

* *chassis_info.smbios_tag* - The assigned asset tag number of the chassis.

**socket** - keyword

* *listening_ports.socket* - Socket handle or inode number
* *process_open_sockets.socket* - Socket handle or inode number
* *socket_events.socket* - The local path (UNIX domain socket only)

**socket_designation** - keyword, text.text

* *cpu_info.socket_designation* - The assigned socket on the board for the given CPU.

**soft_limit** - keyword, text.text

* *ulimit_info.soft_limit* - Current limit value

**softirq** - keyword, number.long

* *cpu_time.softirq* - Time spent servicing softirqs

**sort** - keyword, text.text

* *windows_search.sort* - Sort for windows api

**source** - keyword, text.text

* *apt_sources.source* - Source file
* *autoexec.source* - Source table of the autoexec item
* *deb_packages.source* - Package source
* *docker_container_mounts.source* - Source path on host
* *lxd_storage_pools.source* - Storage pool source
* *package_install_history.source* - Install source: usually the installer process name
* *routes.source* - Route source
* *rpm_packages.source* - Source RPM package name (optional)
* *shellbags.source* - Shellbags source Registry file
* *startup_items.source* - Directory or plist containing startup item
* *sudoers.source* - Source file containing the given rule
* *windows_events.source* - Source or channel of the event
* *yum_sources.source* - Source file

**source_path** - keyword, text.text

* *systemd_units.source_path* - Path to the (possibly generated) unit configuration file

**source_url** - keyword, text.text

* *firefox_addons.source_url* - URL that installed the addon

**space_total** - keyword, number.long

* *lxd_storage_pools.space_total* - Total available storage space in bytes for this storage pool

**space_used** - keyword, number.long

* *lxd_storage_pools.space_used* - Storage space used in bytes

**spare_disks** - keyword, number.long

* *md_devices.spare_disks* - Number of idle disks in array

**spec_version** - keyword, text.text

* *tpm_info.spec_version* - Trusted Computing Group specification that the TPM supports

**speculative** - keyword, number.long

* *virtual_memory_info.speculative* - Total number of speculative pages.

**speed** - keyword, number.long

* *interface_details.speed* - Estimate of the current bandwidth in bits per second.

**src_ip** - keyword, text.text

* *iptables.src_ip* - Source IP address.

**src_mask** - keyword, text.text

* *iptables.src_mask* - Source IP address mask.

**src_port** - keyword, text.text

* *iptables.src_port* - Protocol source port(s).

**ssh_config_file** - keyword, text.text

* *ssh_configs.ssh_config_file* - Path to the ssh_config file

**ssh_public_key** - keyword, text.text

* *ec2_instance_metadata.ssh_public_key* - SSH public key. Only available if supplied at instance launch time
* *ycloud_instance_metadata.ssh_public_key* - SSH public key. Only available if supplied at instance launch time

**ssid** - keyword, text.text

* *wifi_networks.ssid* - SSID octets of the network
* *wifi_status.ssid* - SSID octets of the network
* *wifi_survey.ssid* - SSID octets of the network

**stack_trace** - keyword, text.text

* *crashes.stack_trace* - Most recent frame from the stack trace
* *windows_crashes.stack_trace* - Multiple stack frames from the stack trace

**start** - keyword, text.text

* *memory_map.start* - Start address of memory region
* *process_memory_map.start* - Virtual start address (hex)

**start_interval** - keyword, text.text

* *launchd.start_interval* - Frequency to run in seconds

**start_on_mount** - keyword, text.text

* *launchd.start_on_mount* - Run daemon or agent every time a filesystem is mounted

**start_time** - keyword, number.long

* *docker_container_processes.start_time* - Process start in seconds since boot (non-sleeping)
* *osquery_info.start_time* - UNIX time in seconds when the process started
* *processes.start_time* - Process start time in seconds since Epoch, in case of error -1

**start_type** - keyword, text.text

* *services.start_type* - Service start type: BOOT_START, SYSTEM_START, AUTO_START, DEMAND_START, DISABLED

**started_at** - keyword, text.text

* *docker_containers.started_at* - Container start time as string

**starting_address** - keyword, text.text

* *memory_array_mapped_addresses.starting_address* - Physical stating address, in kilobytes, of a range of memory mapped to physical memory array
* *memory_device_mapped_addresses.starting_address* - Physical stating address, in kilobytes, of a range of memory mapped to physical memory array

**state** - keyword

* *alf_exceptions.state* - Firewall exception state. 0 if the application is configured to allow incoming connections, 2 if the application is configured to block incoming connections and 3 if the application is configuted to allow incoming connections but with additional restrictions.
* *battery.state* - One of the following: "AC Power" indicates the battery is connected to an external power source, "Battery Power" indicates that the battery is drawing internal power, "Off Line" indicates the battery is off-line or no longer connected
* *chrome_extensions.state* - 1 if this extension is enabled
* *docker_container_processes.state* - Process state
* *docker_containers.state* - Container state (created, restarting, running, removing, paused, exited, dead)
* *lxd_networks.state* - Network status
* *md_drives.state* - State of the drive
* *process_open_sockets.state* - TCP socket state
* *processes.state* - Process state
* *scheduled_tasks.state* - State of the scheduled task
* *system_extensions.state* - System extension state
* *windows_optional_features.state* - Installation state value. 1 == Enabled, 2 == Disabled, 3 == Absent
* *windows_security_products.state* - State of protection

**state_timestamp** - keyword, text.text

* *windows_security_products.state_timestamp* - Timestamp for the product state

**stateful** - keyword, number.long

* *lxd_instances.stateful* - Whether the instance is stateful(1) or not(0)

**statename** - keyword, text.text

* *windows_optional_features.statename* - Installation state name. 'Enabled','Disabled','Absent'

**status** - keyword, text.text

* *carves.status* - Status of the carve, can be STARTING, PENDING, SUCCESS, or FAILED
* *chassis_info.status* - If available, gives various operational or nonoperational statuses such as OK, Degraded, and Pred Fail.
* *deb_packages.status* - Package status
* *docker_containers.status* - Container status information
* *kernel_modules.status* - Kernel module status
* *lxd_cluster_members.status* - Status of the node (Online/Offline)
* *lxd_instances.status* - Instance state (running, stopped, etc.)
* *md_devices.status* - Current state of the array
* *ntdomains.status* - The current status of the domain object.
* *process_events.status* - OpenBSM Attribute: Status of the process
* *services.status* - Service Current status: STOPPED, START_PENDING, STOP_PENDING, RUNNING, CONTINUE_PENDING, PAUSE_PENDING, PAUSED
* *shared_memory.status* - Destination/attach status
* *shared_resources.status* - String that indicates the current status of the object.
* *socket_events.status* - Either 'succeeded', 'failed', 'in_progress' (connect() on non-blocking socket) or 'no_client' (null accept() on non-blocking socket)
* *startup_items.status* - Startup status; either enabled or disabled

**stderr_path** - keyword, text.text

* *launchd.stderr_path* - Pipe stderr to a target path

**stdout_path** - keyword, text.text

* *launchd.stdout_path* - Pipe stdout to a target path

**steal** - keyword, number.long

* *cpu_time.steal* - Time spent in other operating systems when running in a virtualized environment

**stealth_enabled** - keyword, number.long

* *alf.stealth_enabled* - 1 If stealth mode is enabled else 0

**stibp_support_enabled** - keyword, number.long

* *kva_speculative_info.stibp_support_enabled* - Windows uses STIBP.

**storage** - keyword, number.long

* *unified_log.storage* - the storage category for the entry

**storage_driver** - keyword, text.text

* *docker_info.storage_driver* - Storage driver

**store** - keyword, text.text

* *certificates.store* - Certificate system store

**store_id** - keyword, text.text

* *certificates.store_id* - Exists for service/user stores. Contains raw store id provided by WinAPI.

**store_location** - keyword, text.text

* *certificates.store_location* - Certificate system store location

**strings** - keyword, text.text

* *yara.strings* - Matching strings
* *yara_events.strings* - Matching strings

**sub_state** - keyword, text.text

* *systemd_units.sub_state* - The low-level unit activation state, values depend on unit type

**subclass** - keyword, text.text

* *usb_devices.subclass* - USB Device subclass

**subject** - keyword, text.text

* *certificates.subject* - Certificate distinguished name (deprecated, use subject2)

**subject2** - keyword, text.text

* *certificates.subject2* - Certificate distinguished name

**subject_alternative_names** - keyword, text.text

* *curl_certificate.subject_alternative_names* - Subject Alternative Name

**subject_info_access** - keyword, text.text

* *curl_certificate.subject_info_access* - Subject Information Access

**subject_key_id** - keyword, text.text

* *certificates.subject_key_id* - SKID an optionally included SHA1

**subject_key_identifier** - keyword, text.text

* *curl_certificate.subject_key_identifier* - Subject Key Identifier

**subject_name** - keyword, text.text

* *authenticode.subject_name* - The certificate subject name

**subkey** - keyword, text.text

* *plist.subkey* - Intermediate key path, includes lists/dicts
* *preferences.subkey* - Intemediate key path, includes lists/dicts

**subnet** - keyword, text.text

* *docker_networks.subnet* - Network subnet

**subscription_id** - keyword, text.text

* *azure_instance_metadata.subscription_id* - Azure subscription for the VM

**subscriptions** - keyword, number.long

* *osquery_events.subscriptions* - Number of subscriptions the publisher received or subscriber used

**subsystem** - keyword, text.text

* *system_controls.subsystem* - Subsystem ID, control type
* *unified_log.subsystem* - the subsystem of the os_log_t used

**subsystem_model** - keyword, text.text

* *pci_devices.subsystem_model* - Device description of PCI device subsystem

**subsystem_model_id** - keyword, text.text

* *pci_devices.subsystem_model_id* - Model ID of PCI device subsystem

**subsystem_vendor** - keyword, text.text

* *pci_devices.subsystem_vendor* - Vendor of PCI device subsystem

**subsystem_vendor_id** - keyword, text.text

* *pci_devices.subsystem_vendor_id* - Vendor ID of PCI device subsystem

**success** - keyword, number.long

* *socket_events.success* - Deprecated. Use the 'status' column instead

**suid** - keyword

* *docker_container_processes.suid* - Saved user ID
* *process_events.suid* - Saved user ID at process start
* *process_file_events.suid* - Saved user ID of the process using the file
* *processes.suid* - Unsigned saved user ID

**summary** - keyword, text.text

* *chocolatey_packages.summary* - Package-supplied summary
* *python_packages.summary* - Package-supplied summary

**superblock_state** - keyword, text.text

* *md_devices.superblock_state* - State of the superblock

**superblock_update_time** - keyword, number.long

* *md_devices.superblock_update_time* - Unix timestamp of last update

**superblock_version** - keyword, text.text

* *md_devices.superblock_version* - Version of the superblock

**support_url** - keyword, text.text

* *windows_update_history.support_url* - Hyperlink to the language-specific support information for an update

**swap_cached** - keyword, number.long

* *memory_info.swap_cached* - The amount of swap, in bytes, used as cache memory

**swap_free** - keyword, number.long

* *memory_info.swap_free* - The total amount of swap free, in bytes

**swap_ins** - keyword, number.long

* *virtual_memory_info.swap_ins* - The total number of compressed pages that have been swapped out to disk.

**swap_limit** - keyword, number.long

* *docker_info.swap_limit* - 1 if swap limit support is enabled. 0 otherwise

**swap_outs** - keyword, number.long

* *virtual_memory_info.swap_outs* - The total number of compressed pages that have been swapped back in from disk.

**swap_total** - keyword, number.long

* *memory_info.swap_total* - The total amount of swap available, in bytes

**symlink** - keyword, number.long

* *file.symlink* - 1 if the path is a symlink, otherwise 0

**syscall** - keyword, text.text

* *bpf_process_events.syscall* - System call name
* *bpf_socket_events.syscall* - System call name
* *process_events.syscall* - Syscall name: fork, vfork, clone, execve, execveat
* *seccomp_events.syscall* - Type of the system call

**system** - keyword, number.long

* *cpu_time.system* - Time spent in system mode

**system_cpu_usage** - keyword, number.long

* *docker_container_stats.system_cpu_usage* - CPU system usage

**system_model** - keyword, text.text

* *kernel_panics.system_model* - Physical system model, for example 'MacBookPro12,1 (Mac-E43C1C25D4880AD6)'

**system_time** - keyword, number.long

* *osquery_schedule.system_time* - Total system time in milliseconds spent executing
* *processes.system_time* - CPU time in milliseconds spent in kernel space

**tag** - keyword, text.text

* *syslog_events.tag* - The syslog tag

**tags** - keyword, text.text

* *docker_image_history.tags* - Comma-separated list of tags
* *docker_images.tags* - Comma-separated list of repository tags
* *yara.tags* - Matching tags
* *yara_events.tags* - Matching tags

**tapping_process** - keyword, number.long

* *event_taps.tapping_process* - The process ID of the application that created the event tap.

**target** - keyword

* *fan_speed_sensors.target* - Target speed
* *iptables.target* - Target that applies for this rule.

**target_name** - keyword, text.text

* *prometheus_metrics.target_name* - Address of prometheus target

**target_path** - keyword, text.text

* *file_events.target_path* - The path associated with the event
* *yara_events.target_path* - The path scanned

**task** - keyword, number.long

* *windows_eventlog.task* - Task value associated with the event
* *windows_events.task* - Task value associated with the event

**team** - keyword, text.text

* *system_extensions.team* - Signing team ID

**team_id** - keyword, text.text

* *es_process_events.team_id* - Team identifier of the process

**team_identifier** - keyword, text.text

* *signature.team_identifier* - The team signing identifier sealed into the signature

**temporarily_disabled** - keyword, number.long

* *wifi_networks.temporarily_disabled* - 1 if this network is temporarily disabled, 0 otherwise

**terminal** - keyword, text.text

* *user_events.terminal* - The network protocol ID

**threads** - keyword, number.long

* *docker_container_processes.threads* - Number of threads used by process
* *processes.threads* - Number of threads used by process

**throttled** - keyword, number.long

* *virtual_memory_info.throttled* - Total number of throttled pages.

**tid** - keyword, number.long

* *bpf_process_events.tid* - Thread ID
* *bpf_socket_events.tid* - Thread ID
* *unified_log.tid* - the tid of the thread that made the entry
* *windows_crashes.tid* - Thread ID of the crashed thread
* *windows_eventlog.tid* - Thread ID which emitted the event record

**time** - keyword

* *apparmor_events.time* - Time of execution in UNIX time
* *asl.time* - Unix timestamp.  Set automatically
* *bpf_process_events.time* - Time of execution in UNIX time
* *bpf_socket_events.time* - Time of execution in UNIX time
* *carves.time* - Time at which the carve was kicked off
* *disk_events.time* - Time of appearance/disappearance in UNIX time
* *docker_container_processes.time* - Cumulative CPU time. [DD-]HH:MM:SS format
* *es_process_events.time* - Time of execution in UNIX time
* *es_process_file_events.time* - Time of execution in UNIX time
* *file_events.time* - Time of file event
* *hardware_events.time* - Time of hardware event
* *kernel_panics.time* - Formatted time of the event
* *last.time* - Entry timestamp
* *logged_in_users.time* - Time entry was made
* *ntfs_journal_events.time* - Time of file event
* *package_install_history.time* - Label date as UNIX timestamp
* *powershell_events.time* - Timestamp the event was received by the osquery event publisher
* *process_etw_events.time* - Event timestamp in Unix format
* *process_events.time* - Time of execution in UNIX time
* *process_file_events.time* - Time of execution in UNIX time
* *seccomp_events.time* - Time of execution in UNIX time
* *selinux_events.time* - Time of execution in UNIX time
* *shell_history.time* - Entry timestamp. It could be absent, default value is 0.
* *socket_events.time* - Time of execution in UNIX time
* *syslog_events.time* - Current unix epoch time
* *user_events.time* - Time of execution in UNIX time
* *user_interaction_events.time* - Time
* *windows_events.time* - Timestamp the event was received
* *xprotect_reports.time* - Quarantine alert time
* *yara_events.time* - Time of the scan

**time_nano_sec** - keyword, number.long

* *asl.time_nano_sec* - Nanosecond time.

**time_range** - keyword, text.text

* *windows_eventlog.time_range* - System time to selectively filter the events

**time_windows** - keyword, number.long

* *process_etw_events.time_windows* - Event timestamp in Windows format

**timeout** - keyword, text.text

* *authorizations.timeout* - Label top-level key
* *curl_certificate.timeout* - Set this value to the timeout in seconds to complete the TLS handshake (default 4s, use 0 for no timeout)
* *kernel_keys.timeout* - The amount of time until the key will expire, expressed in human-readable form. The string perm here means that the key is permanent (no timeout).  The string expd means that the key has already expired.

**timestamp** - keyword, text.text

* *time.timestamp* - Current timestamp (log format) in UTC
* *unified_log.timestamp* - unix timestamp associated with the entry
* *windows_eventlog.timestamp* - Timestamp to selectively filter the events

**timestamp_double** - keyword, text.text

* *unified_log.timestamp_double* - floating point timestamp associated with the entry

**timestamp_ms** - keyword, number.long

* *prometheus_metrics.timestamp_ms* - Unix timestamp of collected data in MS

**timezone** - keyword, text.text

* *time.timezone* - Timezone for reported time (hardcoded to UTC)

**title** - keyword, text.text

* *cups_jobs.title* - Title of the printed job
* *windows_update_history.title* - Title of an update

**token_elevation_status** - keyword, number.long

* *process_etw_events.token_elevation_status* - Primary token elevation status - Present only on ProcessStart events

**token_elevation_type** - keyword, text.text

* *process_etw_events.token_elevation_type* - Primary token elevation type - Present only on ProcessStart events

**total_seconds** - keyword, number.long

* *uptime.total_seconds* - Total uptime seconds

**total_size** - keyword, number.long

* *docker_container_processes.total_size* - Total virtual memory size
* *processes.total_size* - Total virtual memory size (Linux, Windows) or 'footprint' (macOS)

**total_width** - keyword, number.long

* *memory_devices.total_width* - Total width, in bits, of this memory device, including any check or error-correction bits

**transaction_id** - keyword, number.long

* *file_events.transaction_id* - ID used during bulk update
* *yara_events.transaction_id* - ID used during bulk update

**translated** - keyword, number.long

* *processes.translated* - Indicates whether the process is running under the Rosetta Translation Environment, yes=1, no=0, error=-1.

**transmit_rate** - keyword, text.text

* *wifi_status.transmit_rate* - The current transmit rate

**tries** - keyword, text.text

* *authorizations.tries* - Label top-level key

**tty** - keyword, text.text

* *last.tty* - Entry terminal
* *logged_in_users.tty* - Device name

**turbo_disabled** - keyword, number.long

* *msr.turbo_disabled* - Whether the turbo feature is disabled.

**turbo_ratio_limit** - keyword, number.long

* *msr.turbo_ratio_limit* - The turbo feature ratio limit.

**type** - keyword, text.text

* *apparmor_events.type* - Event type
* *appcompat_shims.type* - Type of the SDB database.
* *block_devices.type* - Block device type string
* *bpf_socket_events.type* - The socket type
* *crashes.type* - Type of crash log
* *device_file.type* - File status
* *device_firmware.type* - Type of device
* *device_partitions.type* - Filesystem type if recognized, otherwise, 'meta', 'normal', or 'unallocated'
* *disk_encryption.type* - Description of cipher type and mode if available
* *disk_info.type* - The interface type of the disk.
* *dns_cache.type* - DNS record type
* *dns_resolvers.type* - Address type: sortlist, nameserver, search
* *docker_container_mounts.type* - Type of mount (bind, volume)
* *docker_container_ports.type* - Protocol (tcp, udp)
* *docker_volumes.type* - Volume type
* *file.type* - File status
* *firefox_addons.type* - Extension, addon, webapp
* *hardware_events.type* - Type of hardware and hardware event
* *homebrew_packages.type* - Package type ('formula' or 'cask')
* *interface_addresses.type* - Type of address. One of dhcp, manual, auto, other, unknown
* *interface_details.type* - Interface type (includes virtual)
* *kernel_keys.type* - The key type.
* *keychain_items.type* - Keychain item type (class)
* *last.type* - Entry type, according to ut_type types (utmp.h)
* *logged_in_users.type* - Login type
* *logical_drives.type* - Deprecated (always 'Unknown').
* *lxd_certificates.type* - Type of the certificate
* *lxd_networks.type* - Type of network
* *mounts.type* - Mounted device type
* *ntfs_acl_permissions.type* - Type of access mode for the access control entry.
* *nvram.type* - Data type (CFData, CFString, etc)
* *osquery_events.type* - Either publisher or subscriber
* *osquery_extensions.type* - SDK extension type: core, extension, or module
* *osquery_flags.type* - Flag type
* *process_etw_events.type* - Event Type (ProcessStart, ProcessStop)
* *process_open_pipes.type* - Pipe Type: named vs unnamed/anonymous
* *registry.type* - Type of the registry value, or 'subkey' if item is a subkey
* *routes.type* - Type of route
* *selinux_events.type* - Event type
* *shared_resources.type* - Type of resource being shared. Types include: disk drives, print queues, interprocess communications (IPC), and general devices.
* *smbios_tables.type* - Table entry type
* *smc_keys.type* - SMC-reported type literal type
* *startup_items.type* - Startup Item or Login Item
* *system_controls.type* - Data type
* *ulimit_info.type* - System resource to be limited
* *user_events.type* - The file description for the process socket
* *users.type* - Whether the account is roaming (domain), local, or a system profile
* *windows_crashes.type* - Type of crash log
* *windows_search.type* - The item type
* *windows_security_products.type* - Type of security product
* *xprotect_meta.type* - Either plugin or extension

**type_name** - keyword, text.text

* *last.type_name* - Entry type name, according to ut_type types (utmp.h)
* *shared_resources.type_name* - Human readable value for the 'type' column

**uid** - keyword

* *account_policy_data.uid* - User ID
* *asl.uid* - UID that sent the log message (set by the server).
* *authorized_keys.uid* - The local owner of authorized_keys file
* *bpf_process_events.uid* - User ID
* *bpf_socket_events.uid* - User ID
* *browser_plugins.uid* - The local user that owns the plugin
* *chrome_extension_content_scripts.uid* - The local user that owns the extension
* *chrome_extensions.uid* - The local user that owns the extension
* *crashes.uid* - User ID of the crashed process
* *device_file.uid* - Owning user ID
* *disk_encryption.uid* - Currently authenticated user if available
* *docker_container_processes.uid* - User ID
* *es_process_events.uid* - User ID of the process
* *file.uid* - Owning user ID
* *file_events.uid* - Owning user ID
* *firefox_addons.uid* - The local user that owns the addon
* *kernel_keys.uid* - The user ID of the key owner.
* *known_hosts.uid* - The local user that owns the known_hosts file
* *launchd_overrides.uid* - User ID applied to the override, 0 applies to all
* *package_bom.uid* - Expected user of file or directory
* *password_policy.uid* - User ID for the policy, -1 for policies that are global
* *process_events.uid* - User ID at process start
* *process_file_events.uid* - The uid of the process performing the action
* *processes.uid* - Unsigned user ID
* *safari_extensions.uid* - The local user that owns the extension
* *seccomp_events.uid* - User ID of the user who started the analyzed process
* *shell_history.uid* - Shell history owner
* *ssh_configs.uid* - The local owner of the ssh_config file
* *user_events.uid* - User ID
* *user_groups.uid* - User ID
* *user_ssh_keys.uid* - The local user that owns the key file
* *users.uid* - User ID
* *vscode_extensions.uid* - The local user that owns the plugin

**uid_signed** - keyword, number.long

* *users.uid_signed* - User ID as int64 signed (Apple)

**umci_policy_status** - keyword, text.text

* *deviceguard_status.umci_policy_status* - The status of the User Mode Code Integrity security settings. Returns UNKNOWN if an error is encountered.

**uncompressed** - keyword, number.long

* *virtual_memory_info.uncompressed* - Total number of uncompressed pages.

**uninstall_string** - keyword, text.text

* *programs.uninstall_string* - Path and filename of the uninstaller.

**unique_chip_id** - keyword, text.text

* *ibridge_info.unique_chip_id* - Unique id of the iBridge controller

**unit_file_state** - keyword, text.text

* *systemd_units.unit_file_state* - Whether the unit file is enabled, e.g. `enabled`, `masked`, `disabled`, etc

**unix_time** - keyword, number.long

* *time.unix_time* - Current UNIX time in UTC

**unmask** - keyword, number.long

* *portage_keywords.unmask* - If the package is unmasked

**unused_devices** - keyword, text.text

* *md_devices.unused_devices* - Unused devices

**update_id** - keyword, text.text

* *windows_update_history.update_id* - Revision-independent identifier of an update

**update_revision** - keyword, number.long

* *windows_update_history.update_revision* - Revision number of an update

**update_source_alias** - keyword, text.text

* *lxd_images.update_source_alias* - Alias of image at update source server

**update_source_certificate** - keyword, text.text

* *lxd_images.update_source_certificate* - Certificate for update source server

**update_source_protocol** - keyword, text.text

* *lxd_images.update_source_protocol* - Protocol used for image information update and image import from source server

**update_source_server** - keyword, text.text

* *lxd_images.update_source_server* - Server for image update

**update_url** - keyword, text.text

* *chrome_extensions.update_url* - Extension-supplied update URI

**upid** - keyword, number.long

* *processes.upid* - A 64bit pid that is never reused. Returns -1 if we couldn't gather them from the system.

**uploaded_at** - keyword, text.text

* *lxd_images.uploaded_at* - ISO time of image upload

**upn** - keyword, text.text

* *logon_sessions.upn* - The user principal name (UPN) for the owner of the logon session.

**uppid** - keyword, number.long

* *processes.uppid* - The 64bit parent pid that is never reused. Returns -1 if we couldn't gather them from the system.

**uptime** - keyword, number.long

* *apparmor_events.uptime* - Time of execution in system uptime
* *kernel_panics.uptime* - System uptime at kernel panic in nanoseconds
* *process_events.uptime* - Time of execution in system uptime
* *process_file_events.uptime* - Time of execution in system uptime
* *seccomp_events.uptime* - Time of execution in system uptime
* *selinux_events.uptime* - Time of execution in system uptime
* *socket_events.uptime* - Time of execution in system uptime
* *user_events.uptime* - Time of execution in system uptime

**url** - keyword, text.text

* *curl.url* - The url for the request
* *lxd_cluster_members.url* - URL of the node

**usage** - keyword, number.long

* *kernel_keys.usage* - the number of threads and open file references that refer to this key.

**usb_address** - keyword, number.long

* *usb_devices.usb_address* - USB Device used address

**usb_port** - keyword, number.long

* *usb_devices.usb_port* - USB Device used port

**use** - keyword, text.text

* *memory_arrays.use* - Function for which the array is used
* *portage_use.use* - USE flag which has been enabled for package

**used_by** - keyword, text.text

* *kernel_modules.used_by* - Module reverse dependencies
* *lxd_networks.used_by* - URLs for containers using this network

**user** - keyword

* *cpu_time.user* - Time spent in user mode
* *cups_jobs.user* - The user who printed the job
* *docker_container_processes.user* - User name
* *logged_in_users.user* - User login name
* *logon_sessions.user* - The account name of the security principal that owns the logon session.
* *sandboxes.user* - Sandbox owner
* *systemd_units.user* - The configured user, if any

**user_account** - keyword, text.text

* *services.user_account* - The name of the account that the service process will be logged on as when it runs. This name can be of the form Domain\UserName. If the account belongs to the built-in domain, the name can be of the form .\UserName.

**user_account_control** - keyword, text.text

* *windows_security_center.user_account_control* - The health of the User Account Control (UAC) capability in Windows

**user_action** - keyword, text.text

* *xprotect_reports.user_action* - Action taken by user after prompted

**user_agent** - keyword, text.text

* *curl.user_agent* - The user-agent string to use for the request

**user_namespace** - keyword, text.text

* *docker_containers.user_namespace* - User namespace
* *process_namespaces.user_namespace* - user namespace inode

**user_time** - keyword, number.long

* *osquery_schedule.user_time* - Total user time in milliseconds spent executing
* *processes.user_time* - CPU time in milliseconds spent in user space

**user_uuid** - keyword, text.text

* *disk_encryption.user_uuid* - UUID of authenticated user if available

**username** - keyword, text.text

* *certificates.username* - Username
* *es_process_events.username* - Username
* *last.username* - Entry username
* *launchd.username* - Run this daemon or agent as this username
* *managed_policies.username* - Policy applies only this user
* *preferences.username* - (optional) read preferences for a specific user
* *process_etw_events.username* - User rights - primary token username
* *rpm_package_files.username* - File default username from info DB
* *shadow.username* - Username
* *startup_items.username* - The user associated with the startup item
* *suid_bin.username* - Binary owner username
* *users.username* - Username
* *windows_crashes.username* - Username of the user who ran the crashed process

**uses_pattern** - keyword, number.long

* *xprotect_entries.uses_pattern* - Uses a match pattern instead of identity

**uts_namespace** - keyword, text.text

* *docker_containers.uts_namespace* - UTS namespace
* *process_namespaces.uts_namespace* - uts namespace inode

**uuid** - keyword, text.text

* *block_devices.uuid* - Block device Universally Unique Identifier
* *disk_encryption.uuid* - Disk Universally Unique Identifier
* *disk_events.uuid* - UUID of the volume inside DMG if available
* *managed_policies.uuid* - Optional UUID assigned to policy set
* *osquery_extensions.uuid* - The transient ID assigned for communication
* *osquery_info.uuid* - Unique ID provided by the system
* *system_info.uuid* - Unique ID provided by the system
* *users.uuid* - User's UUID (Apple) or SID (Windows)
* *vscode_extensions.uuid* - Extension UUID

**valid_from** - keyword, text.text

* *curl_certificate.valid_from* - Period of validity start date

**valid_to** - keyword, text.text

* *curl_certificate.valid_to* - Period of validity end date

**value** - keyword, text.text

* *ad_config.value* - Variable typed option value
* *augeas.value* - The value of the configuration item
* *azure_instance_tags.value* - The tag value
* *cpuid.value* - Bit value or string
* *default_environment.value* - Value of the environment variable
* *docker_container_envs.value* - Environment variable value
* *docker_container_labels.value* - Optional label value
* *docker_image_labels.value* - Optional label value
* *docker_network_labels.value* - Optional label value
* *docker_volume_labels.value* - Optional label value
* *ec2_instance_tags.value* - Tag value
* *extended_attributes.value* - The parsed information from the attribute
* *launchd_overrides.value* - Overridden value
* *lxd_instance_config.value* - Configuration parameter value
* *lxd_instance_devices.value* - Device info param value
* *managed_policies.value* - Policy value
* *mdls.value* - Value stored in the metadata key
* *nvram.value* - Raw variable data
* *oem_strings.value* - The value of the OEM string
* *osquery_flags.value* - Flag value
* *plist.value* - String value of most CF types
* *power_sensors.value* - Power in Watts
* *preferences.value* - String value of most CF types
* *process_envs.value* - Environment variable value
* *selinux_settings.value* - Active value.
* *smc_keys.value* - A type-encoded representation of the key value
* *wmi_bios_info.value* - Value of the Bios setting

**valuetype** - keyword, text.text

* *mdls.valuetype* - CoreFoundation type of data stored in value

**variable** - keyword, text.text

* *default_environment.variable* - Name of the environment variable

**vbs_status** - keyword, text.text

* *deviceguard_status.vbs_status* - The status of the virtualization based security settings. Returns UNKNOWN if an error is encountered.

**vendor** - keyword, text.text

* *block_devices.vendor* - Block device vendor string
* *disk_events.vendor* - Disk event vendor string
* *hardware_events.vendor* - Hardware device vendor
* *pci_devices.vendor* - PCI Device vendor
* *platform_info.vendor* - Platform code vendor
* *rpm_packages.vendor* - Package vendor
* *usb_devices.vendor* - USB Device vendor string

**vendor_id** - keyword, text.text

* *connected_displays.vendor_id* - The vendor ID of the display.
* *hardware_events.vendor_id* - Hex encoded Hardware vendor identifier
* *pci_devices.vendor_id* - Hex encoded PCI Device vendor identifier
* *usb_devices.vendor_id* - Hex encoded USB Device vendor identifier

**vendor_syndrome** - keyword, text.text

* *memory_error_info.vendor_syndrome* - Vendor specific ECC syndrome or CRC data associated with the erroneous access

**version** - keyword, text.text

* *alf.version* - Application Layer Firewall version
* *apt_sources.version* - Repository source version
* *authorizations.version* - Label top-level key
* *azure_instance_metadata.version* - Version of the VM image
* *bitlocker_info.version* - The FVE metadata version of the drive.
* *browser_plugins.version* - Plugin short version
* *chocolatey_packages.version* - Package-supplied version
* *chrome_extension_content_scripts.version* - Extension-supplied version
* *chrome_extensions.version* - Extension-supplied version
* *crashes.version* - Version info of the crashed process
* *curl_certificate.version* - Version Number
* *deb_packages.version* - Package version
* *device_firmware.version* - Firmware version
* *deviceguard_status.version* - The version number of the Device Guard build.
* *docker_version.version* - Docker version
* *drivers.version* - Driver version
* *es_process_events.version* - Version of EndpointSecurity event
* *es_process_file_events.version* - Version of EndpointSecurity event
* *firefox_addons.version* - Addon-supplied version string
* *gatekeeper.version* - Version of Gatekeeper's gke.bundle
* *homebrew_packages.version* - Current 'linked' version
* *ie_extensions.version* - Version of the executable
* *intel_me_info.version* - Intel ME version
* *kernel_extensions.version* - Extension version
* *kernel_info.version* - Kernel version
* *npm_packages.version* - Package-supplied version
* *office_mru.version* - Office application version number
* *os_version.version* - Pretty, suitable for presentation, OS version
* *osquery_extensions.version* - Extension's version
* *osquery_info.version* - osquery toolkit version
* *osquery_packs.version* - Minimum osquery version that this query will run on
* *package_install_history.version* - Package display version
* *package_receipts.version* - Installed package version
* *platform_info.version* - Platform code version
* *portage_keywords.version* - The version which are affected by the use flags, empty means all
* *portage_packages.version* - The version which are affected by the use flags, empty means all
* *portage_use.version* - The version of the installed package
* *programs.version* - Product version information.
* *python_packages.version* - Package-supplied version
* *rpm_packages.version* - Package version
* *safari_extensions.version* - Extension long version
* *system_extensions.version* - System extension version
* *usb_devices.version* - USB Device version number
* *vscode_extensions.version* - Extension version
* *windows_crashes.version* - File version info of the crashed process

**video_mode** - keyword, text.text

* *video_info.video_mode* - The current resolution of the display.

**virtual_process** - keyword, number.long

* *processes.virtual_process* - Process is virtual (e.g. System, Registry, vmmem) yes=1, no=0

**visible** - keyword, number.long

* *firefox_addons.visible* - 1 If the addon is shown in browser else 0

**visible_alarm** - keyword, text.text

* *chassis_info.visible_alarm* - If TRUE, the frame is equipped with a visual alarm.

**vm_id** - keyword, text.text

* *azure_instance_metadata.vm_id* - Unique identifier for the VM
* *azure_instance_tags.vm_id* - Unique identifier for the VM

**vm_scale_set_name** - keyword, text.text

* *azure_instance_metadata.vm_scale_set_name* - VM scale set name

**vm_size** - keyword, text.text

* *azure_instance_metadata.vm_size* - VM size

**voltage** - keyword, number.long

* *battery.voltage* - The battery's current voltage in mV

**volume_creation** - keyword, text.text

* *prefetch.volume_creation* - Volume creation time.

**volume_id** - keyword, number.long

* *quicklook_cache.volume_id* - Parsed volume ID from fs_id

**volume_serial** - keyword, text.text

* *file.volume_serial* - Volume serial number
* *prefetch.volume_serial* - Volume serial number.

**volume_size** - keyword, number.long

* *platform_info.volume_size* - (Optional) size of firmware volume

**vscode_edition** - keyword, text.text

* *vscode_extensions.vscode_edition* - VSCode or VSCode Insiders

**wall_time** - keyword, number.long

* *osquery_schedule.wall_time* - Total wall time in seconds spent executing (deprecated), hidden=True

**wall_time_ms** - keyword, number.long

* *osquery_schedule.wall_time_ms* - Total wall time in milliseconds spent executing

**warning** - keyword, number.long

* *shadow.warning* - Number of days before password expires to warn user about it

**was_captive_network** - keyword, number.long

* *wifi_networks.was_captive_network* - 1 if this network was previously a captive network, 0 otherwise

**watch_paths** - keyword, text.text

* *launchd.watch_paths* - Key that launches daemon or agent if path is modified

**watcher** - keyword, number.long

* *osquery_info.watcher* - Process (or thread/handle) ID of optional watcher process

**weekday** - keyword, text.text

* *time.weekday* - Current weekday in UTC

**win32_exit_code** - keyword, number.long

* *services.win32_exit_code* - The error code that the service uses to report an error that occurs when it is starting or stopping

**win_timestamp** - keyword, number.long

* *time.win_timestamp* - Timestamp value in 100 nanosecond units

**windows_security_center_service** - keyword, text.text

* *windows_security_center.windows_security_center_service* - The health of the Windows Security Center Service

**wired** - keyword, number.long

* *virtual_memory_info.wired* - Total number of wired down pages.

**wired_size** - keyword, number.long

* *docker_container_processes.wired_size* - Bytes of unpageable memory used by process
* *processes.wired_size* - Bytes of unpageable memory used by process

**working_directory** - keyword, text.text

* *launchd.working_directory* - Key used to specify a directory to chdir to before launch

**working_disks** - keyword, number.long

* *md_devices.working_disks* - Number of working disks in array

**world** - keyword, number.long

* *portage_packages.world* - If package is in the world file

**writable** - keyword, number.long

* *disk_events.writable* - 1 if writable, 0 if not

**xpath** - keyword, text.text

* *windows_eventlog.xpath* - The custom query to filter events

**year** - keyword, number.long

* *time.year* - Current year in UTC

**zero_fill** - keyword, number.long

* *virtual_memory_info.zero_fill* - Total number of zero filled pages.

**zone** - keyword, text.text

* *azure_instance_metadata.zone* - Availability zone of the VM
* *ycloud_instance_metadata.zone* - Availability zone of the VM
