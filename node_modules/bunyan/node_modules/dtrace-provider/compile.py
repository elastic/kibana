{
    'conditions': [
        ['OS=="mac" or OS=="solaris"', {
            'variables': {
              'escaped_root': '<!(printf %q "<(module_root_dir)")',
            },

            # If we are on the Mac, or a Solaris derivative, attempt
            # to build the DTrace provider extension.

            'targets': [
                {
                    'target_name': 'DTraceProviderBindings',
                    'sources': [
                        'dtrace_provider.cc',
                        'dtrace_probe.cc',
                        'dtrace_argument.cc'
                    ],
                    'include_dirs': [
                      'libusdt',
                      '<!(node -e "require(\'nan\')")',
                    ],
                    'dependencies': [
                        'libusdt'
                    ],
                    'libraries': [
                        '-L<(escaped_root)/libusdt -l usdt'
                    ]
                },
                {
                    'target_name': 'libusdt',
                    'type': 'none',
                    'actions': [{
                        'inputs': [''],
                        'outputs': [''],
                        'action_name': 'build_libusdt',
	      	        'action': [
                            'sh', 'libusdt-build.sh'
		        ]
                    }]
                }
            ]
        },

        # If we are not on the Mac or Solaris, DTrace is unavailable. 
        # This target is necessary because GYP requires at least one
        # target to exist.

        {
            'targets': [ 
                {
                    'target_name': 'DTraceProviderStub',
                    'type': 'none'
                }
            ]
        }]
    ]
}
