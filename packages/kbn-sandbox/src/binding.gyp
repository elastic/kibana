{
  "targets": [
    {
      "sources": [
        "native/module.cpp",
      ],
      "conditions": [
        ['OS=="linux"', { "sources": [ "native/linux/sandbox.cpp" ], "target_name": "sandbox_linux" }],
        ['OS=="win"', { "sources": [ "native/win/sandbox.cpp" ], "target_name": "sandbox_win32" }],
        ['OS=="mac"', { "sources": [ "native/mac/sandbox.cpp" ], "target_name": "sandbox_mac" }]
      ]
    },
    {
      "target_name": "action_after_build",
      "type": "none",
      "conditions": [
        ['OS=="linux"', {
          "dependencies": [ "sandbox_linux" ],
          "copies": [
            {
              "files": [ "<(module_root_dir)/build/Release/sandbox_linux.node" ],
              "destination": "<(module_root_dir)/../bin"
            }
          ]
        }],
        ['OS=="win"', {
          "dependencies": [ "sandbox_win32" ],
          "copies": [
            {
              "files": [ "<(module_root_dir)/build/Release/sandbox_win32.node" ],
              "destination": "<(module_root_dir)/../bin"
            }
          ]
        }],
        ['OS=="mac"', { }]
      ]
    }
  ]
}
