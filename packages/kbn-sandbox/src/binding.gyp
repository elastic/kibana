{
  "targets": [
    {
      "sources": [
        "native/module.cpp",
      ],
      "conditions": [
        ['OS=="linux"', { "sources": [ "native/sandbox_linux.cpp" ], "target_name": "sandbox_linux" }],
        ['OS=="win"', { "sources": [ "native/sandbox_win.cpp" ], "target_name": "sandbox_win32" }],
        ['OS=="mac"', { "sources": [ "native/sandbox_mac.cpp" ], "target_name": "sandbox_mac" }]
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
